import { HTMLProps, useState } from 'react'

export type FileData = {
  name: string
  path: string
  content: string
  extension: 'js' | 'txt'
}

export interface FileSystemProps extends HTMLProps<HTMLDivElement> {
  files: Record<string, FileData>
  handleOpen: () => void
  handleSave?: () => void
  handleSaveAs?: () => void
}

export default function FileSystem({
  files,
  handleOpen,
  handleSave,
  handleSaveAs,
  ...props
}: FileSystemProps) {
  const [editingName, setEditingName] = useState(false)

  return (
    <div {...props}>
      <div className="flex gap-2 mb-2">
        <button onClick={handleOpen}>Open</button>
        <button onClick={handleSave}>Save</button>
        <button onClick={handleSaveAs}>Save as</button>
      </div>
      <ul>
        {Object.values(files).map(({ name, path, extension }) => (
          <li key={path} className="flex gap-2">
            <span
              className={`border border-stone-800 bg-stone-950 w-10 text-center ${extension === 'js' ? 'text-amber-400' : 'text-blue-700'}`}
            >
              {extension}
            </span>
            <input
              className="cursor-text focus:border-none focus:outline-none"
              size={name.length}
              onClick={() => setEditingName(true)}
              contentEditable={editingName}
              value={name}
              readOnly
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
