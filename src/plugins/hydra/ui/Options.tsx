import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin, UIProps } from 'src/types/plugins'
import { DEFAULT_PERFORMANCE_TEXT, HydraState, PerformanceText } from '../store'
import FileSystem, { FileData } from '@renderer/components/FileSystem'

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
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<HydraState>
  const { shader, shaderPath, shaderName, performanceText, setPerformanceText } =
    instance.useStore()

  const files: Record<string, FileData> = shaderPath
    ? {
        [shaderPath]: {
          name: shaderName ?? 'untitled',
          path: shaderPath,
          content: shader,
          extension: 'js'
        }
      }
    : {}

  const handleOpen = async () => {
    const { success, content, path, error } = await window.api.hydraFile.open()
    if (success && content && path) {
      const { openShader } = instance.useStore.getState()
      openShader(content, path)
    } else {
      console.error(error)
    }
  }

  const handleSave = async () => {
    const { shader: currentShader, shaderPath: currentPath } = instance.useStore.getState()
    if (!currentPath) {
      await handleSaveAs()
      return
    }
    await window.api.hydraFile.save(currentShader, currentPath)
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
    }
  }

  return (
    <div>
      <FileSystem
        className="border-none p-4"
        handleOpen={handleOpen}
        handleSave={handleSave}
        handleSaveAs={handleSaveAs}
        files={files}
      />
      <div className="px-4 pb-4 text-xs flex flex-col gap-1 font-neon">
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
