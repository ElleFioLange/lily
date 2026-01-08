import { HTMLProps, ReactNode } from 'react'
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
  children,
  className = '',
  contentClassName = '',
  panelId,
  onClick
}: PanelProps) {
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
      <div className={`flex-1 overflow-auto ${contentClassName}`}>{children}</div>
    </div>
  )
}
