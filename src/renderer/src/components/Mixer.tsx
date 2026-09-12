import { useRef, useState } from 'react'
import { BlendMode, GraphicsState, useGraphicsStore } from '@renderer/stores/useGraphicsStore'
import { BLEND_MODES } from '@renderer/graphics/blendModes'
import { usePreviewStore } from '@renderer/stores/usePreviewStore'
import Header from './common/Header'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'

type SourceControlProps = {
  name: string
  alpha: number
  enabled: boolean
  blendMode: BlendMode
  setAlpha: (alpha: number) => void
  setEnabled: (enabled: boolean) => void
  setBlendMode: (blendMode: BlendMode) => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
}

function SourceControl({
  name,
  alpha,
  enabled,
  blendMode,
  setAlpha,
  setEnabled,
  setBlendMode,
  onDragStart,
  onDragOver,
  onDrop
}: SourceControlProps) {
  // Row drag (reorder) only arms from the ⠿ grip — a draggable row swallows
  // mousedown-drag on the range input, making the slider thumb undraggable.
  const [dragArmed, setDragArmed] = useState(false)
  return (
    <div
      draggable={dragArmed}
      onDragStart={onDragStart}
      onDragEnd={() => setDragArmed(false)}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver(e)
      }}
      onDrop={onDrop}
      className="grid grid-cols-[12px_72px_minmax(0,1fr)_auto] gap-2 items-center"
    >
      <span
        className="text-stone-500 select-none cursor-grab active:cursor-grabbing"
        onMouseDown={() => setDragArmed(true)}
        onMouseUp={() => setDragArmed(false)}
      >
        ⠿
      </span>
      <span
        className={`cursor-pointer ${enabled ? 'hover:line-through' : 'line-through'}`}
        onClick={() => setEnabled(!enabled)}
      >
        {name}
      </span>
      <input
        type="range"
        value={alpha}
        onChange={({ target: { value } }) => setAlpha(parseFloat(value))}
        step={0.01}
        min={0}
        max={1}
      />
      <select
        value={blendMode as string}
        onChange={({ target: { value } }) => setBlendMode(value as BlendMode)}
        className="bg-stone-900 border border-stone-700 text-xs px-1 cursor-pointer"
        title="Blend mode"
      >
        {BLEND_MODES.map(({ value, label }) => (
          <option key={value as string} value={value as string}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )
}

type MixerSectionsProps = Pick<
  GraphicsState,
  'editors' | 'graphics' | 'editorsOrder' | 'graphicsOrder' | 'updateParams' | 'reorderSource'
>

// Editor + graphics source controls. Driven by either the live graphics store or the preview store.
export function MixerSections({
  editors,
  graphics,
  editorsOrder,
  graphicsOrder,
  updateParams,
  reorderSource
}: MixerSectionsProps) {
  const { getInstance } = usePluginsStore()
  const dragIndex = useRef<{ type: 'graphics' | 'editors'; index: number } | null>(null)

  function makeDragHandlers(type: 'graphics' | 'editors', index: number) {
    return {
      onDragStart: () => {
        dragIndex.current = { type, index }
      },
      onDragOver: () => {},
      onDrop: () => {
        if (
          dragIndex.current &&
          dragIndex.current.type === type &&
          dragIndex.current.index !== index
        ) {
          reorderSource(type, dragIndex.current.index, index)
        }
        dragIndex.current = null
      }
    }
  }

  return (
    <>
      <span className="font-bold my-1 text-sm">EDITORS</span>
      {editorsOrder.map((id, index) => {
        const params = editors[id]
        const plugin = getInstance(id)
        if (!params || !plugin) return null
        return (
          <SourceControl
            key={id}
            name={plugin.manifest.name}
            alpha={params.alpha ?? 0}
            enabled={params.enabled ?? false}
            setAlpha={(alpha) => updateParams(id, 'editors', { alpha })}
            setEnabled={(enabled) => updateParams(id, 'editors', { enabled })}
            blendMode={params.blendMode ?? 'source-over'}
            setBlendMode={(blendMode) => updateParams(id, 'editors', { blendMode })}
            {...makeDragHandlers('editors', index)}
          />
        )
      })}
      <span className="font-bold my-1 text-sm">GRAPHICS</span>
      {graphicsOrder.map((id, index) => {
        const params = graphics[id]
        const plugin = getInstance(id)
        if (!params || !plugin) return null
        return (
          <SourceControl
            key={id}
            name={plugin.manifest.name}
            alpha={params.alpha ?? 0}
            enabled={params.enabled ?? false}
            setAlpha={(alpha) => updateParams(id, 'graphics', { alpha })}
            setEnabled={(enabled) => updateParams(id, 'graphics', { enabled })}
            blendMode={params.blendMode ?? 'source-over'}
            setBlendMode={(blendMode) => updateParams(id, 'graphics', { blendMode })}
            {...makeDragHandlers('graphics', index)}
          />
        )
      })}
    </>
  )
}

export default function Mixer() {
  const live = useGraphicsStore()
  const preview = usePreviewStore()

  return (
    <div className="flex flex-col h-full">
      <Header title="MIXER">
        <button
          className={`ml-auto shrink-0 text-xs ${preview.active ? 'bg-amber-400 text-stone-950 hover:bg-amber-300' : ''}`}
          onClick={preview.toggle}
          title="Toggle preview mode (Cmd+Alt+P)"
        >
          preview
        </button>
      </Header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-2 pb-8 text-xs flex flex-col gap-1 *:align-center font-neon">
        {preview.active ? (
          <>
            <span className="font-bold my-1 text-sm text-amber-400">PREVIEW MIX</span>
            <div className="flex gap-2 overflow-auto">
              <button onClick={preview.copyFromLive}>copy from live</button>
              <button onClick={preview.sendToLive}>send to live</button>
            </div>
            <MixerSections key="preview" {...preview} />
          </>
        ) : (
          <>
            <span className="font-bold my-1 text-sm">PRESETS</span>
            <div className="flex gap-2 overflow-auto">
              <button>preset 1</button>
              <button>preset 2</button>
            </div>
            <MixerSections key="live" {...live} />
          </>
        )}
      </div>
    </div>
  )
}
