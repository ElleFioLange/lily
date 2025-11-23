import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import LivePreview from './panels/LivePreview'
import HydraPreview from './panels/HydraPreview'
import AbletonMonitor from './panels/AbletonMonitor'
import HydraPatches from './panels/HydraPatches'
import ProjectConfig from './panels/ProjectConfig'

export default function Layout() {
  return (
    <PanelGroup direction="horizontal" className="w-full h-full">
      {/* Main Content Area - Left Side */}
      <Panel defaultSize={85} minSize={50}>
        <PanelGroup direction="vertical">
          {/* Top Row - Live Preview & Hydra Preview */}
          <Panel defaultSize={50} minSize={20}>
            <PanelGroup direction="horizontal">
              {/* Live Preview */}
              <Panel defaultSize={50} minSize={20}>
                <LivePreview />
              </Panel>

              <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-slate-700 transition-colors cursor-col-resize flex items-center justify-center">
                <div className="text-slate-100 opacity-50 text-xs">|||</div>
              </PanelResizeHandle>

              {/* Hydra Preview */}
              <Panel defaultSize={50} minSize={20}>
                <HydraPreview />
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="h-1 bg-slate-800 hover:bg-slate-700 transition-colors cursor-row-resize flex items-center justify-center">
            <div className="text-slate-100 opacity-50 text-xs">\u2630</div>
          </PanelResizeHandle>

          {/* Bottom Row - Ableton Monitor & Hydra Patches */}
          <Panel defaultSize={50} minSize={20}>
            <PanelGroup direction="horizontal">
              {/* Ableton Monitor */}
              <Panel defaultSize={50} minSize={20}>
                <AbletonMonitor />
              </Panel>

              <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-slate-700 transition-colors cursor-col-resize flex items-center justify-center">
                <div className="text-slate-100 opacity-50 text-xs">|||</div>
              </PanelResizeHandle>

              {/* Hydra Patches */}
              <Panel defaultSize={50} minSize={20}>
                <HydraPatches />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </Panel>

      <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-slate-700 transition-colors cursor-col-resize flex items-center justify-center">
        <div className="text-slate-100 opacity-50 text-xs">|||</div>
      </PanelResizeHandle>

      {/* Project Config - Right Sidebar */}
      <Panel defaultSize={15} minSize={10} maxSize={30} collapsible>
        <ProjectConfig />
      </Panel>
    </PanelGroup>
  )
}
