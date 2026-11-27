import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { ActiveSource, UIProps } from '@renderer/sources/types'
import { DEFAULT_PERFORMANCE_TEXT, HydraState, PerformanceText } from '../store'
import { useWorkingDirectoryStore } from '@renderer/stores/useWorkingDirectoryStore'
import { nameLayerAfterFile } from '@renderer/utils/actions/openPatch'
import { hydraLayers, setOnTargets, useControlTargets } from '../controlTargets'

const PERFORMANCE_TEXT_CONTROLS: {
  key: keyof PerformanceText
  label: string
  min: number
  max: number
  unit: string
}[] = [
  { key: 'fontSize', label: 'size', min: 8, max: 200, unit: 'px' },
  { key: 'x', label: 'x', min: 0, max: 95, unit: '%' },
  { key: 'y', label: 'y', min: 0, max: 95, unit: '%' }
]

export default function Controls({ instanceId }: UIProps) {
  const { getInstance } = useSourcesStore()
  const instance = getInstance(instanceId) as ActiveSource<HydraState>
  const { shaderPath, performanceText, speed } = instance.useStore()
  const refreshFiles = useWorkingDirectoryStore((state) => state.refresh)
  const active = useSourcesStore((state) => state.active)
  const layers = hydraLayers(active)
  const { selected, toggle, selectAll, clear } = useControlTargets()

  // Each control shows this patch's value and sets the same value on every selected patch
  const setSpeed = (value: number) => setOnTargets(instanceId, (state) => state.setSpeed(value))
  const setPerformanceText = (updates: Partial<PerformanceText>) =>
    setOnTargets(instanceId, (state) => state.setPerformanceText(updates))

  const handleSave = async () => {
    const { shader: currentShader, shaderPath: currentPath } = instance.useStore.getState()
    if (!currentPath) {
      await handleSaveAs()
      return
    }
    const result = await window.api.hydraFile.save(currentShader, currentPath)
    if (result.success) nameLayerAfterFile(instanceId, currentPath)
    void refreshFiles()
  }

  const handleSaveAs = async () => {
    const { shader: currentShader } = instance.useStore.getState()
    const result = await window.api.hydraFile.saveAs(currentShader)
    if (result.success && result.path) {
      const { setShaderPath, setShaderName } = instance.useStore.getState()
      setShaderPath(result.path)
      setShaderName(
        result.path
          .split('/')
          .at(-1)
          ?.replace(/\.[^.]+$/, '') ?? result.path
      )
      nameLayerAfterFile(instanceId, result.path)
      void refreshFiles()
    }
  }

  return (
    <div>
      <div className="flex gap-2 p-4 pb-2">
        <button onClick={handleSave} title={shaderPath ?? 'Not saved yet'}>
          Save
        </button>
        <button onClick={handleSaveAs}>Save as</button>
      </div>
      <div className="px-4 pb-4 text-xs flex flex-col gap-1 font-neon">
        <div className="flex items-center gap-1 my-1" role="group" aria-label="Patches to control">
          <div className="flex flex-wrap gap-1 grow">
            {layers.map(({ instanceId: id, name }, index) => {
              const isFocused = id === instanceId
              const isSelected = isFocused || selected.includes(id)
              return (
                <button
                  key={id}
                  className={`min-w-6 px-1.5 ${isFocused ? 'bg-stone-200 text-stone-950 hover:bg-stone-200' : isSelected ? 'bg-stone-500 text-stone-50' : 'text-stone-400'}`}
                  onClick={() => !isFocused && toggle(id)}
                  aria-pressed={isSelected}
                  title={
                    isFocused
                      ? `${name}: the patch you're on, always controlled`
                      : `${name}: ${isSelected ? 'stop controlling it' : 'control it too'}`
                  }
                >
                  {index + 1}
                </button>
              )
            })}
          </div>
          <button
            className="shrink-0"
            onClick={selectAll}
            title="Control every open patch"
            disabled={layers.length < 2}
          >
            all
          </button>
          <button
            className="shrink-0"
            onClick={clear}
            title="Control only the patch you're on"
            disabled={
              !layers.some(({ instanceId: id }) => id !== instanceId && selected.includes(id))
            }
          >
            only this
          </button>
        </div>
        <div className="flex justify-between items-center my-1">
          <span className="font-bold text-sm">PATCH</span>
          <button onClick={() => setSpeed(1)}>reset</button>
        </div>
        <label className="grid grid-cols-[40px_auto_48px] gap-2 items-center">
          <span>speed</span>
          <input
            type="range"
            value={speed}
            onChange={({ target: { value } }) => setSpeed(parseFloat(value))}
            step={0.01}
            min={0}
            max={2}
          />
          <span className="text-right text-stone-400">{speed.toFixed(2)}×</span>
        </label>
        <div className="flex justify-between items-center my-1">
          <span className="font-bold text-sm">PERFORMANCE TEXT</span>
          <button onClick={() => setPerformanceText(DEFAULT_PERFORMANCE_TEXT)}>reset</button>
        </div>
        {PERFORMANCE_TEXT_CONTROLS.map(({ key, label, min, max, unit }) => (
          <label key={key} className="grid grid-cols-[40px_auto_48px] gap-2 items-center">
            <span>{label}</span>
            <input
              type="range"
              value={performanceText[key]}
              onChange={({ target: { value } }) => setPerformanceText({ [key]: parseFloat(value) })}
              step={1}
              min={min}
              max={max}
            />
            <span className="text-right text-stone-400">
              {performanceText[key]}
              {unit}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
