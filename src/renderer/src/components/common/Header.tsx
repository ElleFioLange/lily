import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { ReactNode, useCallback, useRef, useState } from 'react'

export type HeaderProps = {
  title: string
  /** Show the layer tabs (only the editor's header does, to keep the side panels uncluttered) */
  showTabs?: boolean
  children?: ReactNode
  /** Controls pinned to the right end of the header */
  actions?: ReactNode
}

// TODO need to figure out how to add horizontal scrolling
// basic solution causes problems with overflow: visible for the indicator https://stackoverflow.com/questions/6421966/css-overflow-x-visible-and-overflow-y-hidden-causing-scrollbar-issue

export default function Header({ title, showTabs = false, children, actions }: HeaderProps) {
  const active = useSourcesStore((state) => state.active)
  const sources = Object.values(active)
  const layers = showTabs ? sources.filter(({ manifest }) => !manifest.pinned) : []
  // Pinned sources (Poiesis) sit on their own in the right corner
  const pinned = showTabs ? sources.filter(({ manifest }) => manifest.pinned) : []

  return (
    <div className="w-full h-8 bg-stone-900 border-b border-stone-700 flex p-1 z-10">
      <span className="shrink-0 px-4 text-base">{title.toUpperCase()}</span>
      <div className="grow flex gap-3 overflow-y-visible no-scrollbar">
        {layers.map(({ instanceId, name }) => (
          <Tab key={instanceId} instanceId={instanceId} name={name} closable />
        ))}
        {children}
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2 pl-2">{actions}</div>}
      {pinned.length > 0 && (
        <div className="shrink-0 flex gap-3 ml-3 pl-3 pr-1 border-l border-stone-700">
          {pinned.map(({ instanceId, name }) => (
            <Tab
              key={instanceId}
              instanceId={instanceId}
              name={name}
              hint={`Show ${name} (⌘P toggles)`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

type TabProps = {
  instanceId: string
  name: string
  /** Hydra layers can be closed and renamed; pinned layers can't */
  closable?: boolean
  hint?: string
}

function Tab({ instanceId, name, closable = false, hint }: TabProps) {
  const { focused, setFocused, unloadSource, renameLayer } = useSourcesStore()
  const [editing, setEditing] = useState(false)

  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      unloadSource(instanceId)
    },
    [unloadSource, instanceId]
  )

  return (
    <div className="relative group flex items-center gap-1">
      {editing ? (
        <RenameInput
          name={name}
          onDone={(newName) => {
            if (newName !== null) renameLayer(instanceId, newName)
            setEditing(false)
          }}
        />
      ) : (
        <button
          className={`text-xs border-none bg-transparent ${instanceId === focused ? 'cursor-default' : 'hover:underline'}`}
          onClick={() => setFocused(instanceId)}
          onDoubleClick={closable ? () => setEditing(true) : undefined}
          title={hint ?? 'Double-click to rename'}
        >
          {name}
        </button>
      )}
      {closable && (
        <button
          className="text-xs border-none bg-transparent opacity-0 group-hover:opacity-100 text-stone-400 hover:text-stone-100 leading-none px-0.5 -mt-px"
          onClick={handleClose}
          title="Close layer"
        >
          ×
        </button>
      )}
      {instanceId === focused && (
        <svg
          preserveAspectRatio="none"
          height="8"
          viewBox="0 0 64 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-0 right-0 w-full top-6.75"
        >
          <path
            d="M31.748 8C42.2299 8 51.9055 1 64 1V0H0V1C13.1024 1 21.2661 8 31.748 8Z"
            fill="#D6D3D1"
          />
        </svg>
      )}
    </div>
  )
}

/** Inline name editor: Enter or blur saves, Escape cancels (onDone(null)). */
function RenameInput({ name, onDone }: { name: string; onDone: (name: string | null) => void }) {
  const [value, setValue] = useState(name)
  const finished = useRef(false)
  const finish = (result: string | null): void => {
    if (finished.current) return
    finished.current = true
    onDone(result)
  }
  return (
    <input
      autoFocus
      className="text-xs w-24 bg-stone-800 border border-stone-600 rounded-sm px-1 outline-none"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => finish(value)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') finish(null)
      }}
    />
  )
}
