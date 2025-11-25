interface JSONNavigationProps {
  keys: string[]
  onKeyClick: (key: string) => void
}

export default function JSONNavigation({ keys, onKeyClick }: JSONNavigationProps) {
  if (keys.length === 0) {
    return null
  }

  return (
    <div className="absolute top-2 left-2 z-10 bg-stone-800 border border-stone-700 rounded shadow-lg max-w-xs max-h-96 overflow-auto">
      <div className="px-3 py-2 border-b border-stone-700">
        <div className="text-xs font-semibold text-stone-300">Navigation</div>
      </div>
      <ul className="py-1">
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
    </div>
  )
}
