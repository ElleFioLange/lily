/**
 * Patches can load files by name: `loadScript('hydra-text.js')`, `s0.initImage('reds.svg')`.
 * A name or relative path (no scheme, not starting with /) goes to Lily's file server, which
 * serves imported files by name and the working folder's files by their path there. Full URLs
 * (http://, data:, blob:, ...) and absolute paths are left as they are.
 */
export function resolveFileUrl(url: string): string {
  if (typeof url !== 'string' || url === '') return url
  if (/^[a-z][\w+.-]*:/i.test(url) || url.startsWith('/')) return url
  const path = url.replace(/^(\.\/)+/, '')
  return window.api.fileServer.url + path.split('/').map(encodeURIComponent).join('/')
}

type SourceProto = Record<'initImage' | 'initVideo', (url: string, ...rest: unknown[]) => void>
const patched = new WeakSet<object>()

/**
 * Makes s0–s3's initImage and initVideo take file names too. Hydra's sources share one class, so
 * patching it through any Hydra covers every Hydra in the window.
 */
export function resolveSourceUrls(hydra: { s?: object[] }): void {
  const source = hydra.s?.[0]
  const proto = source && (Object.getPrototypeOf(source) as SourceProto)
  if (!proto || patched.has(proto)) return
  patched.add(proto)
  for (const method of ['initImage', 'initVideo'] as const) {
    const original = proto[method]
    proto[method] = function (this: unknown, url: string, ...rest: unknown[]) {
      return original.call(this, resolveFileUrl(url), ...rest)
    }
  }
}
