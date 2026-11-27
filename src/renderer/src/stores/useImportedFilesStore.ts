import { create } from 'zustand'

export type ImportedFile = { name: string; path: string }

interface ImportedFilesState {
  /** Files imported into Lily's file server, which patches load by name */
  files: ImportedFile[]
  load: () => Promise<void>
  /** Asks for files to import (File > Import does the same) */
  importFiles: () => Promise<void>
  remove: (name: string) => Promise<void>
  setFiles: (files: ImportedFile[]) => void
}

export const useImportedFilesStore = create<ImportedFilesState>((set) => ({
  files: [],
  load: async () => set({ files: await window.api.fileServer.list() }),
  importFiles: async () => set({ files: await window.api.fileServer.import() }),
  remove: async (name) => set({ files: await window.api.fileServer.remove(name) }),
  setFiles: (files) => set({ files })
}))

// File > Import, from the menu
window.api?.fileServer?.onImported((files) => useImportedFilesStore.getState().setFiles(files))
void window.api?.fileServer
  ?.list()
  .then((files) => useImportedFilesStore.getState().setFiles(files))
