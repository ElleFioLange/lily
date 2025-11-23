import { ReactNode, useState } from 'react'

interface PanelProps {
  title?: string
  bg?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
  headerActions?: ReactNode
  children?: ReactNode
  className?: string
  contentClassName?: string
}

export default function Panel({
  title,
  bg = 'bg-slate-700',
  collapsible = false,
  defaultCollapsed = false,
  headerActions,
  children,
  className = '',
  contentClassName = ''
}: PanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  return (
    <div className={`w-full h-full ${bg} flex flex-col ${className}`}>
      {/* Header - only show if title or collapsible or headerActions exist */}
      {(title || collapsible || headerActions) && (
        <div className="flex items-center justify-between p-4 shrink-0">
          {title && <div className="text-slate-100 text-xl font-light">{title}</div>}
          <div className="flex items-center gap-2">
            {headerActions}
            {collapsible && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-slate-100 px-2 py-1 hover:bg-slate-800 rounded transition-colors"
                aria-label={isCollapsed ? 'Expand' : 'Collapse'}
              >
                {isCollapsed ? '<' : '>'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content - hide when collapsed */}
      {!isCollapsed && <div className={`flex-1 overflow-auto ${contentClassName}`}>{children}</div>}
    </div>
  )
}
