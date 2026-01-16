import { FunctionComponent } from 'react'
import { ConfigurationJSON } from './config'
import { StoreApi, UseBoundStore } from 'zustand'

// TODO Force returning an OffscreenCanvas for the renderer and implement web workers for parallelization and performance gains

export type Plugin = {
  manifest: {
    id: string
    name: string
    repo: string
    author: string
    version: string
    outputTypes: ('audio' | 'graphics' | 'editor')[]
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
