import { app } from 'electron'
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { AddressInfo } from 'net'
import { createReadStream, promises as fs } from 'fs'
import { basename, extname, join, resolve, sep } from 'path'

/**
 * Lily's own file server, for patches that load files: `loadScript('hydra-text.js')`,
 * `s0.initImage('reds.svg')`. It serves the files and folders linked with File > Import, then the
 * working folder, by the file's name or its path inside the folder. It listens on 127.0.0.1 only, on port 3000 when that's
 * free (so patches written for a server there keep working) and on any free port otherwise.
 */

const PREFERRED_PORT = 3000

const TYPES: Record<string, string> = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.html': 'text/html',
  '.txt': 'text/plain',
  '.glsl': 'text/plain',
  '.frag': 'text/plain',
  '.vert': 'text/plain',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
}

let baseUrl = ''
/** Files and folders linked with File > Import, newest first */
let links: string[] = []
let workingFolder: () => Promise<string | null> = async () => null

const linksPath = (): string => join(app.getPath('userData'), 'imported-files.json')

async function loadLinks(): Promise<void> {
  try {
    const parsed = JSON.parse(await fs.readFile(linksPath(), 'utf8'))
    // Plain paths; the first version saved { name, path } objects
    links = (Array.isArray(parsed) ? parsed : [])
      .map((link) => (typeof link === 'string' ? link : link?.path))
      .filter((path): path is string => typeof path === 'string' && path !== '')
  } catch {
    links = []
  }
}

/**
 * Links files or folders so patches can load them by name, for good (kept in the app's settings
 * folder, not in a session). Linking something again moves it to the front.
 */
export async function importPaths(paths: string[]): Promise<void> {
  links = [...paths, ...links.filter((link) => !paths.includes(link))]
  await fs.writeFile(linksPath(), JSON.stringify(links, null, 2))
}

export const fileServerUrl = (): string => baseUrl

const isFile = async (path: string): Promise<boolean> =>
  (await fs.stat(path).catch(() => null))?.isFile() ?? false

/** `name` inside `folder`, or null if it would point outside it */
function inside(folder: string, name: string): string | null {
  const root = resolve(folder)
  const path = resolve(root, name)
  return path.startsWith(root + sep) ? path : null
}

/**
 * Where a request's path points, checked in order: a linked file with that name, the path inside
 * each linked folder, then the path inside the working folder. Nothing outside those.
 */
async function locate(urlPath: string): Promise<string | null> {
  let name: string
  try {
    name = decodeURIComponent(urlPath.replace(/^\/+/, ''))
  } catch {
    return null
  }
  if (!name || name.includes('\0')) return null

  for (const link of links) {
    const stat = await fs.stat(link).catch(() => null)
    if (stat?.isFile() && basename(link) === name) return link
    if (stat?.isDirectory()) {
      const path = inside(link, name)
      if (path && (await isFile(path))) return path
    }
  }

  const folder = await workingFolder()
  return folder ? inside(folder, name) : null
}

/**
 * Lily's own pages (file:// when built, localhost in dev) may read what the server sends; web
 * pages open in a browser on the same machine may not.
 */
function allowedOrigin(origin: string | undefined): string | null {
  if (!origin || origin === 'null') return origin ?? null
  try {
    const { hostname } = new URL(origin)
    return hostname === 'localhost' || hostname === '127.0.0.1' ? origin : null
  } catch {
    return null
  }
}

async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const origin = allowedOrigin(request.headers.origin)
  if (origin) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Vary', 'Origin')
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405).end()
    return
  }
  const path = await locate(new URL(request.url ?? '/', 'http://localhost').pathname)
  const stat = path ? await fs.stat(path).catch(() => null) : null
  if (!path || !stat?.isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found')
    return
  }

  const type = TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream'
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' }

  // Videos seek with range requests
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range ?? '')
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, stat.size - Number(range[2]))
    const end = range[1] && range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1
    if (start > end || start >= stat.size) {
      response.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }).end()
      return
    }
    response.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Content-Length': end - start + 1
    })
    if (request.method === 'HEAD') response.end()
    else createReadStream(path, { start, end }).pipe(response)
    return
  }

  response.writeHead(200, { ...headers, 'Content-Length': stat.size })
  if (request.method === 'HEAD') response.end()
  else createReadStream(path).pipe(response)
}

function listen(port: number): Promise<number> {
  return new Promise((done, fail) => {
    const server = createServer((request, response) => {
      handle(request, response).catch(() => {
        if (!response.headersSent) response.writeHead(500)
        response.end()
      })
    })
    server.once('error', fail)
    server.listen(port, '127.0.0.1', () => done((server.address() as AddressInfo).port))
  })
}

/** Starts the server; `getWorkingFolder` gives the folder whose files it serves too */
export async function startFileServer(
  getWorkingFolder: () => Promise<string | null>
): Promise<string> {
  workingFolder = getWorkingFolder
  await loadLinks()
  const port = await listen(PREFERRED_PORT).catch(() => listen(0))
  baseUrl = `http://127.0.0.1:${port}/`
  return baseUrl
}
