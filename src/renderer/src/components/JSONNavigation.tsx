import { useState } from 'react'

interface JSONNavigationProps {
  keys: string[]
  onKeyClick: (key: string) => void
}

export default function JSONNavigation({ keys, onKeyClick }: JSONNavigationProps) {
  const [isCollapsed, setIsCollapsed] = useState(true)

  if (keys.length === 0) {
    return null
  }

  return (
    <div className="bg-stone-800 border-l border-stone-700 grow flex flex-col">
      <div
        className="flex items-center justify-between p-2 border-b border-stone-700 shrink-0"
        style={{
          flexDirection: isCollapsed ? 'column-reverse' : 'row'
        }}
      >
        <div
          className="text-xs font-semibold text-stone-300 px-2 align-middle"
          style={
            isCollapsed
              ? {
                  writingMode: 'sideways-rl'
                }
              : undefined
          }
        >
          Navigation
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-stone-100 px-2 hover:bg-stone-700 rounded transition-colors"
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '<' : '>'}
        </button>
      </div>
      {!isCollapsed && (
        <ul className="py-1 flex-1 overflow-auto">
          {keys.map((key) => (
            <li key={key}>
              <button
                onClick={() => onKeyClick(key)}
                className="w-full text-left px-3 py-1.5 text-sm text-stone-100 hover:bg-stone-700 transition-colors"
              >
                {key}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
