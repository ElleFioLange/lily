// import sendOSC
// import saveFile
// import saveAsFile
// import openFile

import { FunctionComponent } from 'react'
import { ConfigurationJSON } from '../types/config'
import { StoreApi, UseBoundStore } from 'zustand'
import { usePerformanceStore } from '@renderer/stores/usePerformanceStore'

// export { sendOSC, saveFile, saveAsFile, openFile }

// TODO expose Javascript editor and YAML editor (maybe others?) as core primites
// for plugins to use to build their workspaces

export interface Plugin {
  manifest: {
    id: string
    name: string
    repo: string
    author: string
    version: string
    outputType: 'audio' | 'graphics'
  }

  // Primary functionality
  init: () => void
  process: (poiesis: string, config: ConfigurationJSON) => void

  // UI Elements
  Workspace?: FunctionComponent
  Settings?: FunctionComponent
  Monitor?: FunctionComponent
  Renderer?: FunctionComponent

  // State store
  useStore?: UseBoundStore<StoreApi<any>>
}

export function getCompositor() {
  const { compositorRef } = usePerformanceStore.getState()
  return compositorRef
}

export function getWindow() {
  return window
}
