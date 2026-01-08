import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import Main from './panels/Main'
import Settings from './panels/Settings'
import Monitors from './panels/Monitors'

export default function Layout() {
  return (
    <PanelGroup direction="vertical" className="w-full h-full">
      <Panel defaultSize={70} minSize={55}>
        <PanelGroup direction="horizontal">
          <Panel defaultSize={66} minSize={60}>
            <Main />
          </Panel>

          <PanelResizeHandle className="w-px bg-stone-800 cursor-row-resize flex items-center justify-center" />

          <Panel defaultSize={34} collapsible>
            <Settings />
          </Panel>
        </PanelGroup>
      </Panel>

      <PanelResizeHandle className="h-px bg-stone-800 cursor-col-resize flex items-center justify-center" />

      <Panel defaultSize={30} collapsible>
        <Monitors />
      </Panel>
    </PanelGroup>
  )
}
