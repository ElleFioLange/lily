/** Matches `key(...)` occurrences of a config keyword in poiesis text, capturing the args. */
export const keyRegex = (key: string) => new RegExp(`\\b${key}\\(([^\\)]*)\\)`, 'g')
