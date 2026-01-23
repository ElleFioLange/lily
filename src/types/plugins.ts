import { FunctionComponent, HTMLProps } from 'react'
import { ConfigurationJSON } from './config'
import { StoreApi, UseBoundStore } from 'zustand'

// TODO Force returning an OffscreenCanvas for the renderer and implement web workers for parallelization and performance gains

export type PluginState = {
  instanceId: string
}

export type UseStore<StoreType extends PluginState> = UseBoundStore<StoreApi<StoreType>>

export type PluginManifest = {
  id: string
  name: string
  repo: string
  author: string
  version: string
  outputTypes: ('audio' | 'graphics' | 'editor')[]
}

export type UIProps = {
  instanceId: string
}

export type WorkspaceProps = UIProps & HTMLProps<HTMLDivElement>
export type RendererProps = UIProps & HTMLProps<HTMLCanvasElement>

type PluginBase = {
  manifest: PluginManifest

  // Primary functionality
  init: (instanceId: string) => void
  // Poiesis and config are passed as arrays to handle multiple poiesis instances
  process: (instanceId: string, poiesis?: string[], config?: ConfigurationJSON[]) => void
  cleanup: (instanceId: string) => void

  // UI Elements
  Workspace?: FunctionComponent<WorkspaceProps>
  Settings?: FunctionComponent<UIProps>
  Monitor?: FunctionComponent<UIProps>
  Renderer?: FunctionComponent<RendererProps>
}

// Plugin definition can either equal PluginBase or optionally define a StoreType to use a zustand store
export type PluginDefinition<StoreType extends PluginState | void = void> = StoreType extends void
  ? PluginBase
  : PluginBase & {
      createStore: (instanceId: string) => UseStore<Exclude<StoreType, void>>
    }

// An active instance of a plugin is required to have a useStore property if its corresponding PluginDefinition has a createStore property
// Active instances must include an instanceId for managing multiple instances of the same plugin
export type ActivePlugin<StoreType extends PluginState | void = void> = Omit<
  PluginDefinition,
  'createStore'
> & { instanceId: string } & (StoreType extends void
    ? {}
    : { useStore: UseStore<Exclude<StoreType, void>> })
