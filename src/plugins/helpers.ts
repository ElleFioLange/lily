// import sendOSC
// import saveFile
// import saveAsFile
// import openFile
import { useGraphicsStore } from '@renderer/stores/useGraphicsStore'

// export { sendOSC, saveFile, saveAsFile, openFile }

// TODO expose Javascript editor and YAML editor (maybe others?) as core primites
// for plugins to use to build their workspaces

export type { PluginManifest, PluginDefinition, ActivePlugin } from 'src/types/plugins'

export function getCompositor() {
  const { compositorRef } = useGraphicsStore.getState()
  return compositorRef
}
