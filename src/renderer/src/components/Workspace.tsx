// TODO Dynamic imports of the plugins folder

import HydraPlugin from '@plugins/hydra'
import AbletonPlugin from '@plugins/ableton'

import PoiesisWorkspace from '@renderer/surfaces/poiesis/ui/Workspace'
import ConfigWorkspace from '@renderer/surfaces/config/ui/Workspace'
import Header from './common/Header'
import { useState } from 'react'

const surfaces = ['Poiesis', 'Hydra', 'Ableton', 'Config']

function ActiveWorkspace(props: { activeSurface: (typeof surfaces)[number] }) {
  switch (props.activeSurface) {
    case 'Poiesis': {
      return <PoiesisWorkspace />
    }
    case 'Hydra': {
      return HydraPlugin.Workspace ? <HydraPlugin.Workspace /> : null
    }
    case 'Ableton': {
      return AbletonPlugin.Workspace ? <AbletonPlugin.Workspace /> : null
    }
    case 'Config': {
      return <ConfigWorkspace />
    }
    default:
      return null
  }
}

export default function Workspace() {
  const [activeSurface, setActiveSurface] = useState<(typeof surfaces)[number]>('Poiesis')

  return (
    <div className="size-full flex flex-col">
      <Header options={surfaces} title="LILY" active={activeSurface} setActive={setActiveSurface} />
      <div className="relative grow">
        {/* Renderer layers (no interaction) */}
        <div className="absolute size-full pointer-events-none">
          {HydraPlugin.Renderer && <HydraPlugin.Renderer />}
        </div>

        {/* Plugin main layers (interactable) */}
        <div className="absolute size-full grid grid-rows-[min-content_auto]">
          <div className="w-full p-2 flex text-xs">
            <button onClick={() => HydraPlugin.process('', {})}>test</button>
          </div>
          <div className="relative overflow-hidden">
            <ActiveWorkspace activeSurface={activeSurface} />
          </div>
        </div>
      </div>
    </div>
  )
}
