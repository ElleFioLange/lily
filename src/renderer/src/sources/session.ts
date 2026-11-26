/** Small guards for reading untrusted .lly data. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const str = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

export const num = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

/** File name without folders or extension, e.g. /a/b/bars.js → bars */
export const baseName = (path: string): string =>
  path
    .split(/[\\/]/)
    .at(-1)
    ?.replace(/\.[^.]+$/, '') ?? path
