import { FunctionComponent, HTMLProps } from 'react'
import { StoreApi, UseBoundStore } from 'zustand'

/**
 * Lily is a Hydra video mixer. A "source" is one kind of layer the mixer can hold:
 * Hydra (always available) and, when enabled, Poiesis text. Sources are registered
 * statically in `sources/index.ts`; there is no dynamic plugin discovery.
 */

export type SourceState = {
  instanceId: string
}

export type UseStore<StoreType extends SourceState> = UseBoundStore<StoreApi<StoreType>>

export type SourceManifest = {
  id: string
  name: string
  outputTypes: ('graphics' | 'editor')[]
  allowMultiple: boolean
  /** A pinned source gets one instance per session, created at startup, and can't be closed. */
  pinned?: boolean
}

export type UIProps = {
  instanceId: string
  environment?: 'main' | 'performance' | 'preview'
}

export type WorkspaceProps = UIProps & HTMLProps<HTMLDivElement>
export type RendererProps = UIProps & HTMLProps<HTMLCanvasElement>

type SourceBase = {
  manifest: SourceManifest

  init: (instanceId: string) => void
  /** Called on Run (Cmd/Ctrl+Shift+Enter) for every active source. */
  process: (instanceId: string) => void | Promise<void>
  cleanup: (instanceId: string) => void

  Workspace?: FunctionComponent<WorkspaceProps>
  Options?: FunctionComponent<UIProps>
  Monitor?: FunctionComponent<UIProps>
  Renderer?: FunctionComponent<RendererProps>
  /** Rendered once at app level while the source is registered (e.g. input device hooks). */
  Background?: FunctionComponent
}

export type SourceDefinition<StoreType extends SourceState | void = void> = StoreType extends void
  ? SourceBase
  : SourceBase & {
      createStore: (instanceId: string) => UseStore<Exclude<StoreType, void>>
    }

export type ActiveSource<StoreType extends SourceState | void = void> = Omit<
  SourceDefinition,
  'createStore'
> & {
  instanceId: string
  /** The layer's display name: "Layer 1", "Layer 2"... for Hydra, renamable. */
  name: string
} & (StoreType extends void ? object : { useStore: UseStore<Exclude<StoreType, void>> })
