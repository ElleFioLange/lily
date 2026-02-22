import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import Workspace from './Workspace'
import Options from './Options'
import Monitors from './Monitors'
import Mixer from './Mixer'

export default function Layout() {
  return (
    <PanelGroup direction="vertical" className="w-full h-full">
      <Panel defaultSize={70} minSize={55}>
        <PanelGroup direction="horizontal">
          <Panel defaultSize={66} minSize={60}>
            <Workspace />
          </Panel>

          <PanelResizeHandle className="w-px bg-stone-700 cursor-row-resize flex items-center justify-center" />

          <Panel defaultSize={34} collapsible>
            <Options />
          </Panel>
        </PanelGroup>
      </Panel>

      <PanelResizeHandle className="h-px bg-stone-700 cursor-col-resize flex items-center justify-center" />

      <Panel defaultSize={30} collapsible>
        <PanelGroup direction="horizontal">
          <Panel defaultSize={25} minSize={15}>
            <Mixer />
          </Panel>

          <PanelResizeHandle className="w-px bg-stone-700 cursor-row-resize flex items-center justify-center" />

          <Panel minSize={50}>
            <Monitors />
          </Panel>
        </PanelGroup>
      </Panel>
    </PanelGroup>
  )
}
