import { resolveFileUrl } from './fileUrl'

/** Loads a script by URL, or by file name from Lily's file server */
export default function loadScript(url: string) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = resolveFileUrl(url)
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}
