import { app } from 'electron'
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { AddressInfo } from 'net'
import { createReadStream, promises as fs } from 'fs'
import { basename, extname, join, resolve, sep } from 'path'

/**
 * Lily's own file server, for patches that load files: `loadScript('hydra-text.js')`,
 * `s0.initImage('reds.svg')`. It serves files imported with File > Import by name, then any file
 * in the working folder by its path there. It listens on 127.0.0.1 only, on port 3000 when that's
 * free (so patches written for a server there keep working) and on any free port otherwise.
 */

export type ImportedFile = { name: string; path: string }

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
let imported: ImportedFile[] = []
let workingFolder: () => Promise<string | null> = async () => null

const importsPath = (): string => join(app.getPath('userData'), 'imported-files.json')

async function loadImports(): Promise<void> {
  try {
    const parsed = JSON.parse(await fs.readFile(importsPath(), 'utf8'))
    if (Array.isArray(parsed)) {
      imported = parsed.filter(
        (file): file is ImportedFile =>
          typeof file?.name === 'string' && typeof file?.path === 'string'
      )
    }
  } catch {
    imported = []
  }
}

async function saveImports(): Promise<void> {
  await fs.writeFile(importsPath(), JSON.stringify(imported, null, 2))
}

export const importedFiles = (): ImportedFile[] => imported

/** Adds files by their names; a file with the same name as one already imported replaces it */
export async function importFiles(paths: string[]): Promise<ImportedFile[]> {
  for (const path of paths) {
    const name = basename(path)
    imported = [...imported.filter((file) => file.name !== name), { name, path }]
  }
  imported.sort((a, b) => a.name.localeCompare(b.name))
  await saveImports()
  return imported
}

export async function removeImportedFile(name: string): Promise<ImportedFile[]> {
  imported = imported.filter((file) => file.name !== name)
  await saveImports()
  return imported
}

export const fileServerUrl = (): string => baseUrl

/** Where a request's path points: an imported file by name, else a file inside the working folder */
async function locate(urlPath: string): Promise<string | null> {
  let name: string
  try {
    name = decodeURIComponent(urlPath.replace(/^\/+/, ''))
  } catch {
    return null
  }
  if (!name || name.includes('\0')) return null
  const match = imported.find((file) => file.name === name)
  if (match) return match.path

  const folder = await workingFolder()
  if (!folder) return null
  const root = resolve(folder)
  const path = resolve(root, name)
  // Nothing outside the working folder, whatever the path says
  return path.startsWith(root + sep) ? path : null
}

async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
  response.setHeader('Access-Control-Allow-Origin', '*')
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
  await loadImports()
  const port = await listen(PREFERRED_PORT).catch(() => listen(0))
  baseUrl = `http://127.0.0.1:${port}/`
  return baseUrl
}
