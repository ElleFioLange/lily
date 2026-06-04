import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin } from '@plugins/utils'
import { StrudelState } from '../store'
import { UIProps } from 'src/types/plugins'

export default function Monitor({ instanceId }: UIProps) {
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<StrudelState>
  const { isPlaying, bpm, error } = instance.useStore()

  return (
    <div className="size-full flex flex-col gap-3 p-4 text-stone-300 font-mono text-xs">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${isPlaying ? 'bg-emerald-400' : 'bg-stone-600'}`}
        />
        <span className="text-stone-400">{isPlaying ? 'playing' : 'stopped'}</span>
      </div>
      <div>
        <span className="text-stone-500">bpm </span>
        <span>{bpm}</span>
      </div>
      {error && <div className="text-rose-400 break-all">{error}</div>}
    </div>
  )
}
