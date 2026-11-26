import { HTMLProps, useEffect } from 'react'
import { useWorkingDirectoryStore } from '@renderer/stores/useWorkingDirectoryStore'

export interface FileSystemProps extends HTMLProps<HTMLDivElement> {
  /** Path of the file open in the focused layer, highlighted in the list */
  currentPath: string | null
  /** Opens a listed file in the focused layer */
  handleSelect: (path: string) => void
  handleOpen: () => void
  handleSave?: () => void
  handleSaveAs?: () => void
}

/**
 * File browser: Open/Save buttons, then every .js file in the working directory.
 * The list refreshes when the window regains focus, so files made elsewhere show up.
 */
export default function FileSystem({
  currentPath,
  handleSelect,
  handleOpen,
  handleSave,
  handleSaveAs,
  className = '',
  ...props
}: FileSystemProps) {
  const { directory, files, truncated, choose, refresh } = useWorkingDirectoryStore()

  useEffect(() => {
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  const folderName = directory?.split(/[\\/]/).filter(Boolean).at(-1) ?? directory

  return (
    <div className={`flex flex-col gap-2 ${className}`} {...props}>
      <div className="flex gap-2">
        <button onClick={handleOpen}>Open</button>
        <button onClick={handleSave}>Save</button>
        <button onClick={handleSaveAs}>Save as</button>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="truncate grow text-stone-300" title={directory ?? undefined}>
          {folderName ?? 'No folder open'}
        </span>
        {directory && (
          <button className="shrink-0" onClick={() => void refresh()} title="Refresh file list">
            ↻
          </button>
        )}
        <button className="shrink-0" onClick={() => void choose()} title="Open a working directory">
          Open folder
        </button>
      </div>

      {directory === null ? (
        <span className="text-xs text-stone-500">Open a folder to list its .js patches.</span>
      ) : files.length === 0 ? (
        <span className="text-xs text-stone-500">No .js files in this folder.</span>
      ) : (
        <ul className="max-h-64 overflow-y-auto no-scrollbar text-xs flex flex-col">
          {files.map(({ path, relativePath }) => {
            const slash = relativePath.lastIndexOf('/')
            const folder = slash >= 0 ? relativePath.slice(0, slash + 1) : ''
            const name = relativePath.slice(slash + 1)
            const isCurrent = path === currentPath
            return (
              <li key={path}>
                <button
                  className={`w-full text-left border-none px-1 py-0.5 truncate ${isCurrent ? 'bg-stone-700 text-stone-100' : 'bg-transparent hover:bg-stone-800'}`}
                  onClick={() => handleSelect(path)}
                  title={path}
                >
                  <span className="text-stone-500">{folder}</span>
                  {name}
                </button>
              </li>
            )
          })}
          {truncated && (
            <li className="text-stone-500 px-1">Only the first 1000 files are listed.</li>
          )}
        </ul>
      )}
    </div>
  )
}
