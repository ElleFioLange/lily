import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin, UIProps } from 'src/types/plugins'
import { HydraState } from '../store'
import FileSystem, { FileData } from '@renderer/components/FileSystem'

export default function Options({ instanceId }: UIProps) {
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<HydraState>
  const { shader, shaderPath, shaderName } = instance.useStore()

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
      setShaderName(result.path.split('/').at(-1)?.replace(/\.[^.]+$/, '') ?? result.path)
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
    </div>
  )
}
