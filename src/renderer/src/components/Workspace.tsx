import Header from './common/Header'
import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { useMemo } from 'react'
import { usePreviewStore } from '@renderer/stores/usePreviewStore'
import PreviewStage from './PreviewStage'
import { runFocused } from '@renderer/utils/actions/run'
import { useBrowserStore } from '@renderer/stores/useBrowserStore'
import FileSystem from './FileSystem'
import { ActiveSource } from '@renderer/sources/types'
import { HydraState } from '@renderer/sources/hydra/store'

function AddLayer() {
  const addLayer = useSourcesStore((state) => state.addLayer)
  return (
    <button
      className="size-4.5 p-0 mt-1 flex justify-center items-center place-self-center my-auto"
      onClick={addLayer}
      title="Add a Hydra layer"
    >
      +
    </button>
  )
}

function BrowserButton() {
  const { open, toggle } = useBrowserStore()
  return (
    <button
      className={`h-5 px-2 py-0 text-xs border-stone-600 ${open ? 'bg-stone-600 text-stone-50' : 'hover:bg-stone-700'}`}
      onClick={toggle}
      title={`${open ? 'Hide' : 'Show'} the file browser (Cmd+O)`}
      aria-pressed={open}
    >
      files
    </button>
  )
}

function PlayButton() {
  return (
    <button
      className="h-5 px-2 py-0 flex items-center gap-1 text-xs border-stone-600 hover:bg-stone-700"
      onClick={runFocused}
      title="Run this patch (⌘⇧Enter runs every layer)"
      aria-label="Run this patch"
    >
      <svg width="8" height="9" viewBox="0 0 8 9" aria-hidden="true">
        <path d="M0 0L8 4.5L0 9Z" fill="currentColor" />
      </svg>
      run
    </button>
  )
}

export default function Workspace() {
  const { active, focused } = useSourcesStore()
  const previewActive = usePreviewStore((state) => state.active)
  const browserOpen = useBrowserStore((state) => state.open)

  const focusedSurface = useMemo(
    () => Object.values(active).find(({ instanceId }) => instanceId === focused),
    [active, focused]
  )

  const isHydra = focusedSurface?.manifest.id === 'hydra'

  return (
    <div className="size-full flex flex-col">
      <Header
        title="LILY"
        showTabs
        actions={
          focusedSurface && !previewActive ? (
            <>
              {isHydra && <BrowserButton />}
              <PlayButton />
            </>
          ) : null
        }
      >
        <AddLayer />
      </Header>
      <div className="relative grow">
        {previewActive ? (
          <PreviewStage />
        ) : focusedSurface === undefined ? (
          <div className="grid place-items-center">No surface selected</div>
        ) : (
          <>
            {/* Renderer layers (no interaction) */}
            {focusedSurface && focused && focusedSurface.Renderer ? (
              <div className="absolute size-full pointer-events-none">
                <focusedSurface.Renderer instanceId={focused} />
              </div>
            ) : null}

            {/* Source main layers (interactable) */}
            {focusedSurface.Workspace ? (
              <div className="absolute size-full overflow-hidden">
                <focusedSurface.Workspace
                  key={focusedSurface.instanceId}
                  instanceId={focusedSurface.instanceId}
                  environment="main"
                />
              </div>
            ) : null}

            {isHydra && browserOpen ? (
              <FileSystem instance={focusedSurface as ActiveSource<HydraState>} />
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
