import { create } from 'zustand'

export type WorkingFile = { name: string; path: string; relativePath: string }

/** Whether a file sits inside a folder (at any depth) */
export function isInside(path: string, directory: string | null): boolean {
  if (!directory) return false
  const folder = directory.replace(/[\\/]+$/, '')
  return path.startsWith(folder + '/') || path.startsWith(folder + '\\')
}

interface WorkingDirectoryState {
  directory: string | null
  files: WorkingFile[]
  /** More .js files exist than the browser lists */
  truncated: boolean
  /** Files opened from outside the working directory, listed for this session only */
  extraFiles: string[]

  /** Loads the saved directory (or where Lily was launched from) and lists it */
  load: () => Promise<void>
  /** Asks for a folder and switches to it */
  choose: () => Promise<void>
  /** Switches to a known folder, e.g. one saved in a session file */
  setDirectory: (directory: string) => Promise<void>
  /** Re-reads the current folder's files */
  refresh: () => Promise<void>
  /** Lists a file opened from elsewhere, unless it's already in the working directory */
  addExtraFile: (path: string) => void
  setExtraFiles: (paths: string[]) => void
}

export const useWorkingDirectoryStore = create<WorkingDirectoryState>((set, get) => ({
  directory: null,
  files: [],
  truncated: false,
  extraFiles: [],

  load: async () => {
    const directory = await window.api.workingDirectory.get()
    set({ directory })
    await get().refresh()
  },

  choose: async () => {
    const directory = await window.api.workingDirectory.open()
    if (!directory) return
    set({ directory })
    await get().refresh()
  },

  setDirectory: async (directory) => {
    const found = await window.api.workingDirectory.set(directory)
    if (!found) return
    set({ directory: found })
    await get().refresh()
  },

  refresh: async () => {
    const { directory } = get()
    if (!directory) {
      set({ files: [], truncated: false })
      return
    }
    const { files, truncated } = await window.api.workingDirectory.list(directory)
    // Ignore a stale answer if the folder changed while listing
    if (get().directory === directory) set({ files, truncated })
  },

  addExtraFile: (path) => {
    const { directory, extraFiles } = get()
    if (isInside(path, directory) || extraFiles.includes(path)) return
    set({ extraFiles: [...extraFiles, path] })
  },

  setExtraFiles: (paths) => set({ extraFiles: [...new Set(paths)] })
}))
