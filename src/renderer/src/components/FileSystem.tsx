import { useEffect } from 'react'
import { useWorkingDirectoryStore } from '@renderer/stores/useWorkingDirectoryStore'
import { useBrowserStore } from '@renderer/stores/useBrowserStore'
import { ActiveSource } from '@renderer/sources/types'
import { HydraState } from '@renderer/sources/hydra/store'
import { openPatchFile, openPatchFromAnywhere } from '@renderer/utils/actions/openPatch'
import { useSessionStore } from '@renderer/stores/useSessionStore'

// Text sits on its own translucent strip, like the editor's code, so the patch shows through
const STRIP = 'bg-stone-950/70 backdrop-blur-[1px]'

/**
 * File browser over the focused Hydra patch (Cmd+O). Lists every .js file in the working
 * directory, then files opened from other folders this session; picking one opens it in the layer
 * and hides the browser. Open file, Open folder and Open session sit under the folder name. The background is
 * transparent so a running patch stays visible. The list refreshes when the window regains focus.
 */
export default function FileSystem({ instance }: { instance: ActiveSource<HydraState> }) {
  const { directory, files, truncated, extraFiles, choose, refresh } = useWorkingDirectoryStore()
  const setOpen = useBrowserStore((state) => state.setOpen)
  const currentPath = instance.useStore((state) => state.shaderPath)

  useEffect(() => {
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  const folderName = directory?.split(/[\\/]/).filter(Boolean).at(-1) ?? directory

  const select = async (path: string) => {
    if (await openPatchFile(path)) setOpen(false)
  }

  const openElsewhere = async () => {
    if (await openPatchFromAnywhere()) setOpen(false)
  }

  const row = (path: string, folder: string, name: string) => (
    <li key={path} className="max-w-full">
      <button
        className={`max-w-full text-left border-none px-2 py-0.5 truncate ${path === currentPath ? 'bg-stone-600/90 text-stone-50' : `${STRIP} hover:bg-stone-700/90`}`}
        onClick={() => void select(path)}
        title={path}
      >
        <span className="text-stone-400">{folder}</span>
        {name}
      </button>
    </li>
  )

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex justify-end p-4">
      <div className="pointer-events-auto w-80 max-w-full max-h-full min-h-0 flex flex-col gap-2 font-neon">
        <div className={`flex items-center gap-2 text-xs px-2 py-1 ${STRIP}`}>
          <span className="font-bold text-sm shrink-0">FILES</span>
          <span className="truncate grow text-stone-300" title={directory ?? undefined}>
            {folderName ?? 'No folder open'}
          </span>
          {directory && (
            <button className="shrink-0" onClick={() => void refresh()} title="Refresh file list">
              ↻
            </button>
          )}
          <button
            className="shrink-0 border-none bg-transparent hover:bg-transparent text-stone-400 hover:text-stone-100 px-1"
            onClick={() => setOpen(false)}
            title="Hide the file browser (Cmd+O)"
            aria-label="Hide the file browser"
          >
            ×
          </button>
        </div>

        <div className="flex flex-wrap gap-1 text-xs">
          <button
            className={STRIP}
            onClick={() => void openElsewhere()}
            title="Open a .js file from any folder in this layer. Files from outside this folder are added to the list for this session."
          >
            Open file
          </button>
          <button className={STRIP} onClick={() => void choose()} title="Change the working folder">
            Open folder
          </button>
          <button
            className={STRIP}
            onClick={() => void useSessionStore.getState().open()}
            title="Open a .lly session (Cmd+Alt+O)"
          >
            Open session
          </button>
        </div>

        {directory === null ? (
          <span className={`text-xs text-stone-400 px-2 py-1 w-fit ${STRIP}`}>
            Open a folder to list its .js patches.
          </span>
        ) : files.length === 0 ? (
          <span className={`text-xs text-stone-400 px-2 py-1 w-fit ${STRIP}`}>
            No .js files in this folder.
          </span>
        ) : (
          <ul className="border-none min-h-0 overflow-y-auto no-scrollbar text-xs flex flex-col items-start gap-px">
            {files.map(({ path, relativePath }) => {
              const slash = relativePath.lastIndexOf('/')
              return row(path, relativePath.slice(0, slash + 1), relativePath.slice(slash + 1))
            })}
            {truncated && (
              <li className={`text-stone-400 px-2 ${STRIP}`}>
                Only the first 1000 files are listed.
              </li>
            )}
          </ul>
        )}

        {extraFiles.length > 0 && (
          <>
            <span className={`text-xs text-stone-400 px-2 py-0.5 w-fit ${STRIP}`}>
              from other folders
            </span>
            <ul className="border-none shrink-0 max-h-32 overflow-y-auto no-scrollbar text-xs flex flex-col items-start gap-px">
              {extraFiles.map((path) => {
                const parts = path.split(/[\\/]/).filter(Boolean)
                const name = parts.at(-1) ?? path
                const parent = parts.length > 1 ? `${parts.at(-2)}/` : ''
                return row(path, parent, name)
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
