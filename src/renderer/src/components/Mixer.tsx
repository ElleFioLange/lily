import { useGraphicsStore } from '@renderer/stores/useGraphicsStore'
import Header from './common/Header'
// import { Compositor } from '@renderer/graphics/Compositor'
import { useState } from 'react'

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
        min={0}
        max={1}
      />
    </div>
  )
}

export default function Mixer() {
  const { params, updateParams } = useGraphicsStore()
  const [test, setTest] = useState(true)

  return (
    <>
      <Header options={[]} active="test 1" title="MIXER" setActive={() => {}} />

      <div className="max-h-full px-4 pt-2 pb-0 [&::last-child]:mb-4 overflow-auto no-scrollbar text-xs flex flex-col gap-1 *:align-center font-neon">
        <span className="font-bold my-1 text-sm">PRESETS</span>
        <div className="flex gap-2 overflow-auto">
          <button>preset 1</button>
          <button>preset 2</button>
        </div>
        <span className="font-bold my-1 text-sm">EDITORS</span>
        {Object.entries(params).map(([id, { alpha, enabled }]) => {
          return (
            <SourceControl
              key={id}
              name="Poiesis"
              alpha={alpha || 0}
              enabled={enabled || false}
              setAlpha={(alpha) => updateParams(id, { alpha })}
              setEnabled={(enabled) => updateParams(id, { enabled })}
            />
          )
        })}
        {/* <div className="grid grid-cols-[72px_auto] gap-2">
          Poiesis
          <input type="range" />
          </div> */}
        <SourceControl
          name="Poiesis"
          alpha={0}
          enabled={test}
          setAlpha={() => {}}
          setEnabled={setTest}
        />
        <div className="grid grid-cols-[72px_auto] gap-2">
          Hydra
          <input type="range" />
        </div>
        <div className="grid grid-cols-[72px_auto] gap-2">
          Strudel
          <input type="range" />
        </div>
        <span className="font-bold my-1 text-sm">GRAPHICS</span>
        <div className="grid grid-cols-[72px_auto] gap-2">
          Hydra
          <input type="range" />
        </div>
      </div>
    </>
  )
}
