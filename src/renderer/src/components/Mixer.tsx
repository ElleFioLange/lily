import { useRef, useState } from 'react'
import {
  BlendMode,
  GraphicsState,
  MixerParams,
  useGraphicsStore
} from '@renderer/stores/useGraphicsStore'
import { BLEND_MODES } from '@renderer/graphics/blendModes'
import { usePreviewStore } from '@renderer/stores/usePreviewStore'
import {
  MixSnapshot,
  MixerPreset,
  useMixerPresetsStore
} from '@renderer/stores/useMixerPresetsStore'
import Header from './common/Header'
import { useSourcesStore } from '@renderer/stores/useSourcesStore'

type ChannelControlProps = {
  label: string
  title: string
  params: Partial<MixerParams>
  update: (updates: Partial<MixerParams>) => void
}

/** One channel of a layer (its code overlay or its visuals): on/off, opacity and blend mode. */
function ChannelControl({ label, title, params, update }: ChannelControlProps) {
  const enabled = params.enabled ?? false
  return (
    <div className="grid grid-cols-[12px_56px_minmax(0,1fr)_auto] gap-2 items-center">
      <span />
      <button
        className={`text-left text-xs border-none bg-transparent hover:bg-transparent p-0 text-stone-400 ${enabled ? 'hover:line-through' : 'line-through opacity-60'}`}
        onClick={() => update({ enabled: !enabled })}
        title={`${title}: click to turn ${enabled ? 'off' : 'on'}`}
      >
        {label}
      </button>
      <input
        type="range"
        value={params.alpha ?? 0}
        onChange={({ target: { value } }) => update({ alpha: parseFloat(value) })}
        step={0.01}
        min={0}
        max={1}
        aria-label={`${title} opacity`}
      />
      <select
        value={(params.blendMode ?? 'source-over') as string}
        onChange={({ target: { value } }) => update({ blendMode: value as BlendMode })}
        className="bg-stone-900 border border-stone-700 text-xs px-1 cursor-pointer"
        title={`${title} blend mode`}
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

type LayerGroupProps = {
  id: string
  name: string
  focused: boolean
  editor?: Partial<MixerParams>
  graphics?: Partial<MixerParams>
  updateParams: GraphicsState['updateParams']
  /** Reordering is armed from the grip only; omitted for layers that don't move */
  drag?: {
    onDragStart: () => void
    onDrop: () => void
  }
}

/** A layer's channels grouped together: its visuals and the code shown over them. */
function LayerGroup({ id, name, focused, editor, graphics, updateParams, drag }: LayerGroupProps) {
  const setFocused = useSourcesStore((state) => state.setFocused)
  // Row drag (reorder) only arms from the ⠿ grip — a draggable row swallows
  // mousedown-drag on the range inputs, making the slider thumbs undraggable.
  const [dragArmed, setDragArmed] = useState(false)
  return (
    <div
      draggable={drag !== undefined && dragArmed}
      onDragStart={drag?.onDragStart}
      onDragEnd={() => setDragArmed(false)}
      onDragOver={(e) => drag && e.preventDefault()}
      onDrop={drag?.onDrop}
      className={`flex flex-col gap-1 rounded-sm px-1 py-1.5 border ${focused ? 'border-stone-600 bg-stone-800/50' : 'border-transparent'}`}
    >
      <div className="grid grid-cols-[12px_minmax(0,1fr)] gap-2 items-center">
        {drag ? (
          <span
            className="text-stone-500 select-none cursor-grab active:cursor-grabbing"
            onMouseDown={() => setDragArmed(true)}
            onMouseUp={() => setDragArmed(false)}
            title="Drag to reorder"
          >
            ⠿
          </span>
        ) : (
          <span />
        )}
        <button
          className="text-left text-xs border-none bg-transparent hover:bg-transparent p-0 hover:underline truncate"
          onClick={() => setFocused(id)}
          title={`Show ${name}`}
        >
          {name}
        </button>
      </div>
      {graphics && (
        <ChannelControl
          label="visuals"
          title={`${name} visuals`}
          params={graphics}
          update={(updates) => updateParams(id, 'graphics', updates)}
        />
      )}
      {editor && (
        <ChannelControl
          label="code"
          title={`${name} code overlay`}
          params={editor}
          update={(updates) => updateParams(id, 'editors', updates)}
        />
      )}
    </div>
  )
}

type MixerSectionsProps = Pick<
  GraphicsState,
  'editors' | 'graphics' | 'editorsOrder' | 'graphicsOrder' | 'updateParams' | 'reorderSource'
>

/**
 * The mix grouped by layer: each layer's visuals and code overlay together, in stacking order.
 * Moving a layer moves both. Layers with only a code overlay (Poiesis) come last and stay put.
 * Driven by either the live graphics store or the preview store.
 */
export function MixerSections({
  editors,
  graphics,
  editorsOrder,
  graphicsOrder,
  updateParams,
  reorderSource
}: MixerSectionsProps) {
  const { getInstance, focused } = useSourcesStore()
  const dragged = useRef<string | null>(null)

  const layers = graphicsOrder.filter((id) => graphics[id] && getInstance(id))
  const editorOnly = editorsOrder.filter((id) => !graphics[id] && editors[id] && getInstance(id))

  // Move a layer's visuals and its code overlay to the target layer's place
  function moveLayer(from: string, to: string) {
    const gFrom = graphicsOrder.indexOf(from)
    const gTo = graphicsOrder.indexOf(to)
    if (gFrom !== -1 && gTo !== -1) reorderSource('graphics', gFrom, gTo)
    const eFrom = editorsOrder.indexOf(from)
    const eTo = editorsOrder.indexOf(to)
    if (eFrom !== -1 && eTo !== -1) reorderSource('editors', eFrom, eTo)
  }

  return (
    <>
      <span className="font-bold my-1 text-sm">LAYERS</span>
      {layers.map((id) => (
        <LayerGroup
          key={id}
          id={id}
          name={getInstance(id)!.name}
          focused={id === focused}
          graphics={graphics[id]}
          editor={editors[id]}
          updateParams={updateParams}
          drag={{
            onDragStart: () => {
              dragged.current = id
            },
            onDrop: () => {
              if (dragged.current && dragged.current !== id) moveLayer(dragged.current, id)
              dragged.current = null
            }
          }}
        />
      ))}
      {editorOnly.length > 0 && <div className="h-px bg-stone-700 my-1" aria-hidden="true" />}
      {editorOnly.map((id) => (
        <LayerGroup
          key={id}
          id={id}
          name={getInstance(id)!.name}
          focused={id === focused}
          editor={editors[id]}
          updateParams={updateParams}
        />
      ))}
    </>
  )
}

type PresetsProps = {
  mix: MixSnapshot // The mix saved by "+ save" / Shift+click
  onRecall: (preset: MixerPreset) => void
}

// Shared preset list; the live mixer recalls with a crossfade, the preview mixer instantly
function Presets({ mix, onRecall }: PresetsProps) {
  const {
    presets,
    fadeSeconds,
    fading,
    savePreset,
    overwritePreset,
    deletePreset,
    setFadeSeconds
  } = useMixerPresetsStore()

  return (
    <>
      <div className="flex justify-between items-center gap-2 my-1">
        <span className="font-bold text-sm">PRESETS</span>
        <label
          className="flex items-center gap-2"
          title="Crossfade time for recalling presets on the live mix and for send to live"
        >
          <span className={fading ? 'text-amber-400' : ''}>{fading ? 'fading' : 'fade'}</span>
          <input
            type="range"
            className="w-20"
            value={fadeSeconds}
            onChange={({ target: { value } }) => setFadeSeconds(parseFloat(value))}
            step={0.1}
            min={0}
            max={10}
          />
          <span className="w-8 text-right text-stone-400">{fadeSeconds.toFixed(1)}s</span>
        </label>
      </div>
      <div className="flex gap-2 flex-wrap">
        {presets.map((preset) => (
          <div key={preset.id} className="relative group">
            <button
              onClick={(e) => (e.shiftKey ? overwritePreset(preset.id, mix) : onRecall(preset))}
              title="Click to recall, Shift+click to overwrite with the current mix"
            >
              {preset.name}
            </button>
            <button
              className="absolute -top-2 -right-2 border-none bg-transparent hover:bg-transparent text-xs leading-none text-stone-400 hover:text-stone-100 opacity-0 group-hover:opacity-100"
              onClick={() => deletePreset(preset.id)}
              title="Delete preset"
            >
              ×
            </button>
          </div>
        ))}
        <button onClick={() => savePreset(mix)} title="Save the current mix as a new preset">
          + save
        </button>
      </div>
    </>
  )
}

export default function Mixer() {
  const live = useGraphicsStore()
  const preview = usePreviewStore()
  const fadeLiveTo = useMixerPresetsStore((state) => state.fadeLiveTo)
  // Touching the live mix by hand takes over from any running crossfade
  const cancelFade = () => useMixerPresetsStore.getState().cancelFade()

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
            <div className="flex gap-2 flex-wrap shrink-0">
              <button onClick={preview.copyFromLive}>copy from live</button>
              <button onClick={preview.sendToLive}>send to live</button>
            </div>
            <Presets mix={preview} onRecall={preview.applyMix} />
            <MixerSections key="preview" {...preview} />
          </>
        ) : (
          <>
            <Presets mix={live} onRecall={fadeLiveTo} />
            <MixerSections
              key="live"
              {...live}
              updateParams={(...args) => {
                cancelFade()
                live.updateParams(...args)
              }}
              reorderSource={(...args) => {
                cancelFade()
                live.reorderSource(...args)
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
