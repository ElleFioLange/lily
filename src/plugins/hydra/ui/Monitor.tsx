import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin, UIProps } from 'src/types/plugins'
import { HydraState } from '../store'

export default function Monitor({ instanceId, ...props }: UIProps) {
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<HydraState>
  const { monitorActive, toggleMonitor } = instance.useStore()

  return (
    <div className="size-full flex flex-col" {...props}>
      <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-800">
        <label className="text-xs text-stone-400 flex items-center gap-2 cursor-pointer select-none">
          <div
            className={`w-8 h-4 rounded-full relative transition-colors ${monitorActive ? 'bg-stone-400' : 'bg-stone-700'}`}
            onClick={toggleMonitor}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-stone-100 transition-transform ${monitorActive ? 'translate-x-4' : 'translate-x-0.5'}`}
            />
          </div>
          monitor (4-up split) · ⌘⇧M
        </label>
      </div>
      <div className="flex-1 grid place-items-center p-8 text-xs text-stone-500 text-center">
        {monitorActive
          ? 'Monitor active — the workspace shows a 4-up split of outputs o0–o3, time-synced to the live signal.'
          : 'Monitor off — the workspace shows the main signal.'}
      </div>
    </div>
  )
}
