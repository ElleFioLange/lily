import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { ActiveSource, UIProps } from '@renderer/sources/types'
import { DEFAULT_PERFORMANCE_TEXT, HydraState, PerformanceText } from '../store'
import { useWorkingDirectoryStore } from '@renderer/stores/useWorkingDirectoryStore'

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

export default function Options({ instanceId }: UIProps) {
  const { getInstance } = useSourcesStore()
  const instance = getInstance(instanceId) as ActiveSource<HydraState>
  const { shaderPath, performanceText, setPerformanceText, speed, setSpeed } = instance.useStore()
  const refreshFiles = useWorkingDirectoryStore((state) => state.refresh)

  const handleSave = async () => {
    const { shader: currentShader, shaderPath: currentPath } = instance.useStore.getState()
    if (!currentPath) {
      await handleSaveAs()
      return
    }
    await window.api.hydraFile.save(currentShader, currentPath)
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
