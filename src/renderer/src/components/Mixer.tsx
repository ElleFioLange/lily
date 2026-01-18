import { useGraphicsStore } from '@renderer/stores/useGraphicsStore'
import Header from './common/Header'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'

type SourceControlProps = {
  name: string
  alpha: number
  enabled: boolean
  setAlpha: (alpha: number) => void
  setEnabled: (enabled: boolean) => void
}

function SourceControl({ name, alpha, enabled, setAlpha, setEnabled }: SourceControlProps) {
  return (
    <div className="grid grid-cols-[72px_auto] gap-2">
      <span
        className={`cursor-pointer ${enabled ? 'hover:line-through' : 'line-through'}`}
        onClick={() => setEnabled(!enabled)}
      >
        {name}
      </span>
      <input
        type="range"
        value={alpha}
        onChange={({ target: { value } }) => setAlpha(parseFloat(value))}
        step={0.01}
        min={0}
        max={1}
      />
    </div>
  )
}

export default function Mixer() {
  const { editors, graphics, updateParams } = useGraphicsStore()
  const { getInstance } = usePluginsStore()

  return (
    <>
      <Header title="MIXER" />

      <div className="max-h-full px-4 pt-2 pb-0 [&::last-child]:mb-4 overflow-auto no-scrollbar text-xs flex flex-col gap-1 *:align-center font-neon">
        <span className="font-bold my-1 text-sm">PRESETS</span>
        <div className="flex gap-2 overflow-auto">
          <button>preset 1</button>
          <button>preset 2</button>
        </div>
        <span className="font-bold my-1 text-sm">EDITORS</span>
        {Object.entries(editors).map(([id, { alpha, enabled }]) => {
          const plugin = getInstance(id)
          if (plugin === undefined) return null
          const name = plugin.manifest.name
          return (
            <SourceControl
              key={id}
              name={name}
              alpha={alpha || 0}
              enabled={enabled || false}
              setAlpha={(alpha) => updateParams(id, 'editors', { alpha })}
              setEnabled={(enabled) => updateParams(id, 'editors', { enabled })}
            />
          )
        })}
        <span className="font-bold my-1 text-sm">GRAPHICS</span>
        {Object.entries(graphics).map(([id, { alpha, enabled }]) => {
          const plugin = getInstance(id)
          if (plugin === undefined) return null
          const name = plugin.manifest.name
          return (
            <SourceControl
              key={id}
              name={name}
              alpha={alpha || 0}
              enabled={enabled || false}
              setAlpha={(alpha) => updateParams(id, 'graphics', { alpha })}
              setEnabled={(enabled) => updateParams(id, 'graphics', { enabled })}
            />
          )
        })}
      </div>
    </>
  )
}
