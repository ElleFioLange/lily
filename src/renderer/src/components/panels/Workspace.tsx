import HydraPlugin from '@plugins/hydra'
import Header from '../common/Header'

export default function Main() {
  return (
    <div className="size-full flex flex-col">
      <Header options={['test 1', 'test 2']} active="test 1" title="LILY" setActive={() => {}} />
      <div className="relative grow">
        {/* Renderer layers (no interaction) */}
        <div className="absolute size-full pointer-events-none">
          {HydraPlugin.Renderer && <HydraPlugin.Renderer />}
        </div>

        {/* Plugin main layers (interactable) */}
        <div className="absolute size-full grid grid-rows-[min-content_auto]">
          <div className="w-full p-2 flex text-xs">
            <button
              className="border border-stone-700 bg-stone-900/50 px-1 place-items-center"
              onClick={() => HydraPlugin.process('', {})}
            >
              test
            </button>
          </div>
          <div className="relative overflow-hidden">
            {HydraPlugin.Workspace && <HydraPlugin.Workspace />}
          </div>
        </div>
      </div>
    </div>
  )
}
