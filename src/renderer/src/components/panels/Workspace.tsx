import HydraPlugin from '@plugins/hydra'
import Header from '../common/Header'

export default function Main() {
  return (
    <div className="size-full flex flex-col">
      <Header options={['test 1', 'test 2']} active="test 1" title="LILY" setActive={() => {}} />
      <button onClick={() => HydraPlugin.process('', {})}>test</button>
      <div className="relative grow">
        {/* Renderer layers (no interaction) */}
        <div className="absolute size-full pointer-events-none">
          {HydraPlugin.Renderer && <HydraPlugin.Renderer />}
        </div>

        {/* Plugin main layers (interactable) */}
        <div className="absolute size-full">
          {HydraPlugin.Workspace && <HydraPlugin.Workspace />}
        </div>
      </div>
    </div>
  )
}
