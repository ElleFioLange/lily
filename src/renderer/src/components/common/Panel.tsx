import { HTMLProps, ReactNode, useState } from 'react'
import { useFocusStore, type PanelId } from '../../stores/useFocusStore'

interface PanelProps extends HTMLProps<HTMLDivElement> {
  title?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
  headerActions?: ReactNode
  children?: ReactNode
  className?: string
  contentClassName?: string
  panelId?: PanelId
}

export default function Panel({
  title,
  collapsible = false,
  defaultCollapsed = false,
  headerActions,
  children,
  className = '',
  contentClassName = '',
  panelId,
  onClick
}: PanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  const handleFocus = () => {
    if (panelId) {
      useFocusStore.getState().setFocusedPanel(panelId)
    }
  }

  const handleBlur = () => {
    if (panelId) {
      useFocusStore.getState().setFocusedPanel(null)
    }
  }

  return (
    <div
      className={`w-full h-full flex flex-col ${className}`}
      tabIndex={panelId ? 0 : undefined}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={onClick}
    >
      {/* Header - only show if title or collapsible or headerActions exist */}
      {(title || collapsible || headerActions) && (
        <div className="flex items-center justify-between p-4 shrink-0">
          {title && <div className="text-stone-100 text-xl font-light">{title}</div>}
          <div className="flex items-center gap-2">
            {headerActions}
            {collapsible && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-stone-100 px-2 py-1 hover:bg-stone-800 rounded transition-colors"
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
