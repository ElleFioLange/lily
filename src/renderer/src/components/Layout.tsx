import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import Workspace from './Workspace'
import Options from './Options'
import Monitors from './Monitors'
import Mixer from './Mixer'

// Left: the editor on top, monitors below. Right: a full-height sidebar with the
// mixer on top and the focused layer's options below.
export default function Layout() {
  return (
    <PanelGroup direction="horizontal" className="w-full h-full">
      <Panel defaultSize={72} minSize={50}>
        <PanelGroup direction="vertical">
          <Panel defaultSize={70} minSize={40}>
            <Workspace />
          </Panel>

          <PanelResizeHandle className="h-px bg-stone-700 cursor-row-resize flex items-center justify-center" />

          <Panel defaultSize={30} collapsible>
            <Monitors />
          </Panel>
        </PanelGroup>
      </Panel>

      <PanelResizeHandle className="w-px bg-stone-700 cursor-col-resize flex items-center justify-center" />

      <Panel defaultSize={28} minSize={18} collapsible>
        <PanelGroup direction="vertical">
          <Panel defaultSize={60} minSize={25}>
            <Mixer />
          </Panel>

          <PanelResizeHandle className="h-px bg-stone-700 cursor-row-resize flex items-center justify-center" />

          <Panel defaultSize={40} collapsible>
            <Options />
          </Panel>
        </PanelGroup>
      </Panel>
    </PanelGroup>
  )
}
