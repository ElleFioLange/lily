import { useState } from 'react'

export default function HydraPreview() {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="w-full h-full bg-gray-2 flex flex-col">
      {/* Header with title and collapse button */}
      <div className="flex items-center justify-between p-4">
        <div className="text-text-1 text-xl font-light">Hydra preview</div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-text-1 px-2 py-1 hover:bg-gray-3 rounded transition-colors"
        >
          {isCollapsed ? '<' : '>'}
        </button>
      </div>

      {/* Content area with video controls divider */}
      {!isCollapsed && (
        <div className="flex-1 flex flex-col">
          {/* Top section - expandable */}
          <div className="flex-1 flex items-center justify-center bg-gray-2">
            <div className="text-text-1 opacity-50">|||</div>
          </div>

          {/* Video controls section */}
          <div className="bg-gray-3 p-4 flex items-center justify-center">
            <div className="text-text-1 font-light">Video controls</div>
          </div>

          {/* Bottom section - expandable */}
          <div className="flex-1 flex items-center justify-center bg-gray-2">
            <div className="text-text-1 opacity-50">|||</div>
          </div>
        </div>
      )}
    </div>
  )
}
