import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { ActiveSource } from '@renderer/sources/types'
import CanvasMirror from '@renderer/components/common/CanvasMirror'
import { HydraState } from '../store'
import { endPreview, usePatchPreviewStore } from '../patchPreview'

/**
 * While the focused layer is being previewed (Cmd+Enter), its live output keeps playing in a
 * small picture-in-picture in the editor's bottom-right corner. Cmd+Shift+Enter runs the
 * previewed changes on the layer; clicking the picture goes back to the live output.
 */
export default function PreviewPip({ instanceId }: { instanceId: string }) {
  const previewing = usePatchPreviewStore((state) => state.instanceId === instanceId)
  const error = usePatchPreviewStore((state) =>
    state.instanceId === instanceId ? state.error : null
  )
  const instance = useSourcesStore((state) => state.active[instanceId]) as
    | ActiveSource<HydraState>
    | undefined
  const canvas = instance?.useStore((state) => state.canvas) ?? null

  if (!previewing || !instance) return null

  return (
    <>
      {error ? (
        <div className="absolute left-3 bottom-3 z-10 max-w-[60%] px-2 py-1 text-xs bg-stone-950/80 text-rose-300 pointer-events-none">
          preview error: {error}
        </div>
      ) : null}
      <div
        className="absolute right-3 bottom-3 z-10 w-1/5 min-w-32 flex flex-col gap-0.5"
        aria-label="Live output"
      >
        <div className="aspect-video border border-stone-500 shadow-lg shadow-black/60">
          <CanvasMirror
            source={canvas}
            title="Live output. Click to leave the preview; ⌘⇧Enter runs it"
            onClick={() => endPreview(instanceId)}
            className="block size-full bg-black"
          />
        </div>
        <span className="text-[10px] leading-3.5 text-stone-200 bg-stone-950/70 px-1 self-end">
          live · ⌘⇧Enter to run
        </span>
      </div>
    </>
  )
}
