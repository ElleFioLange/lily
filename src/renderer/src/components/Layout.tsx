import { useEffect, useRef } from 'react'
import { ImperativePanelHandle, Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import Workspace from './Workspace'
import Controls from './Controls'
import Monitors from './Monitors'
import Mixer from './Mixer'

// The editor's header (h-8) sits above its 16:9 area
const EDITOR_HEADER = 32
// The editor never takes less or more than this share of the left side's height
const EDITOR_MIN = 40
const EDITOR_MAX = 80

// Left: the editor on top, monitors below. Right: a full-height sidebar with the
// mixer on top and the focused layer's controls below.
export default function Layout() {
  const leftRef = useRef<HTMLDivElement>(null)
  const editorPanel = useRef<ImperativePanelHandle>(null)
  const monitorsPanel = useRef<ImperativePanelHandle>(null)

  // Whenever the left side changes size (window resize, sidebar drag), give the editor exactly
  // a 16:9 area and the monitors everything under it. Dragging the divider between them still
  // works; the editor then letterboxes to stay 16:9.
  useEffect(() => {
    const left = leftRef.current
    if (!left) return
    const fit = () => {
      if (monitorsPanel.current?.isCollapsed()) return
      const { width, height } = left.getBoundingClientRect()
      if (width === 0 || height === 0) return
      const editor = ((width * 9) / 16 + EDITOR_HEADER) / height
      editorPanel.current?.resize(Math.min(EDITOR_MAX, Math.max(EDITOR_MIN, editor * 100)))
    }
    const observer = new ResizeObserver(fit)
    observer.observe(left)
    return () => observer.disconnect()
  }, [])

  return (
    <PanelGroup direction="horizontal" className="w-full h-full">
      <Panel defaultSize={68} minSize={50}>
        <div ref={leftRef} className="size-full">
          <PanelGroup direction="vertical">
            <Panel ref={editorPanel} defaultSize={64} minSize={EDITOR_MIN}>
              <Workspace />
            </Panel>

            <PanelResizeHandle className="h-px bg-stone-700 cursor-row-resize flex items-center justify-center" />

            <Panel ref={monitorsPanel} defaultSize={36} minSize={15} collapsible>
              <Monitors />
            </Panel>
          </PanelGroup>
        </div>
      </Panel>

      <PanelResizeHandle className="w-px bg-stone-700 cursor-col-resize flex items-center justify-center" />

      <Panel defaultSize={32} minSize={18} collapsible>
        <PanelGroup direction="vertical">
          <Panel defaultSize={60} minSize={25}>
            <Mixer />
          </Panel>

          <PanelResizeHandle className="h-px bg-stone-700 cursor-row-resize flex items-center justify-center" />

          <Panel defaultSize={40} collapsible>
            <Controls />
          </Panel>
        </PanelGroup>
      </Panel>
    </PanelGroup>
  )
}
