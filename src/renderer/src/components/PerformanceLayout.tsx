import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import LivePreview from './panels/LivePreview'
import HydraPreview from './panels/HydraPreview'
import AbletonMonitor from './panels/AbletonMonitor'
import HydraPatches from './panels/HydraPatches'
import ProjectConfig from './panels/ProjectConfig'
import VideoControls from './panels/VideoControls'

export default function Layout() {
  return (
    <PanelGroup direction="horizontal" className="w-full h-full">
      {/* Main Content Area - Left Side */}
      <Panel defaultSize={70} minSize={50}>
        <PanelGroup direction="horizontal">
          {/* Left Section - Live Preview & Ableton Monitor */}
          <Panel defaultSize={70} minSize={40}>
            <PanelGroup direction="vertical">
              {/* Live Preview */}
              <Panel defaultSize={60} minSize={20}>
                <LivePreview panelId="live-preview" />
              </Panel>

              <PanelResizeHandle className="h-px bg-stone-800 cursor-col-resize flex items-center justify-center" />

              {/* Ableton Monitor */}
              <Panel defaultSize={40} minSize={20}>
                <AbletonMonitor panelId="ableton-monitor" />
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-px bg-stone-800 cursor-row-resize flex items-center justify-center" />

          {/* Right Section - Hydra Preview & Hydra Patches */}
          <Panel defaultSize={30} minSize={20}>
            <PanelGroup direction="vertical">
              {/* Hydra Preview */}
              <Panel defaultSize={30} minSize={20}>
                <HydraPreview panelId="hydra-preview" />
              </Panel>

              <PanelResizeHandle className="h-px bg-stone-800 cursor-col-resize flex items-center justify-center" />

              {/* Video Controls */}
              <Panel defaultSize={20} minSize={20}>
                <VideoControls panelId="video-controls" />
              </Panel>

              <PanelResizeHandle className="h-px bg-stone-800 cursor-col-resize flex items-center justify-center" />

              {/* Hydra Patches */}
              <Panel defaultSize={50} minSize={20}>
                <HydraPatches panelId="hydra-patches" />
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </Panel>

      <PanelResizeHandle className="w-px bg-stone-800 cursor-col-resize flex items-center justify-center" />

      {/* Project Config - Right Sidebar */}
      <Panel defaultSize={30} minSize={10} maxSize={30} collapsible>
        <ProjectConfig panelId="project-config" />
      </Panel>
    </PanelGroup>
  )
}
