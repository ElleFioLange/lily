import { useEffect, useRef, useState } from 'react'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin, UIProps } from 'src/types/plugins'
import { LiveState } from '../store'
import { LiveDevice, LiveTrack } from '../bridge'
import { colorStyle } from './colors'

// Session-style monitor of the open Live Set, read from the extension bridge.
// One column per track: name header, clips, then devices (expandable to their
// parameters). "Show in Lily" in Live highlights the matching node here
// (left-border accent + a brief pulse) and foregrounds the app.

const ROW = 'px-2 py-0.5 truncate border-l-4'

/** Steady accent + one-shot pulse for the selected node. `seq` changes per
 *  push, re-keying the animation so a repeat selection pulses again. */
const highlight = (selected: boolean) =>
  selected ? 'border-stone-100 animate-select-pulse' : 'border-transparent'

function DeviceRow({
  device,
  selectedPath,
  nodeKey
}: {
  device: LiveDevice
  selectedPath: string | null
  nodeKey: (id: string) => string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-1">
      <div
        key={nodeKey(device.id)}
        onClick={() => setOpen((o) => !o)}
        className={`${ROW} ${highlight(device.id === selectedPath)} bg-stone-800 text-stone-300 cursor-pointer flex items-center gap-1`}
        title={device.id}
      >
        <span className="shrink-0 w-3 text-[10px] opacity-70">{open ? '▾' : '▸'}</span>
        <span className="truncate">◆ {device.name}</span>
        <span className="ml-auto shrink-0 text-[10px] text-stone-500">
          {device.parameters.length}
        </span>
      </div>

      {open &&
        device.parameters.map((p) => (
          <div
            key={nodeKey(p.id)}
            className={`${ROW} ${highlight(p.id === selectedPath)} ml-3 bg-stone-900 text-stone-400`}
            title={`${p.min}–${p.max}${p.isQuantized ? ' · quantized' : ''} · default ${p.defaultValue} · ${p.id}`}
          >
            ◇ {p.name}
          </div>
        ))}
    </div>
  )
}

function TrackColumn({
  track,
  selectedPath,
  selectionSeq
}: {
  track: LiveTrack
  selectedPath: string | null
  selectionSeq: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const containsSelection =
    selectedPath !== null &&
    (track.id === selectedPath ||
      track.clips.some((c) => c.id === selectedPath) ||
      track.devices.some(
        (d) => d.id === selectedPath || d.parameters.some((p) => p.id === selectedPath)
      ))

  useEffect(() => {
    if (containsSelection) ref.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [containsSelection, selectedPath, selectionSeq])

  // key={`${id}:${selectionSeq}`} on the selected node remounts it per push,
  // restarting the CSS animation even when the same node is re-selected.
  const nodeKey = (id: string) => (id === selectedPath ? `${id}:${selectionSeq}` : id)

  return (
    <div ref={ref} className="flex flex-col gap-1 w-36 shrink-0 min-h-0">
      <div
        key={nodeKey(track.id)}
        className={`px-2 py-1 truncate font-bold border-l-4 ${highlight(track.id === selectedPath)}`}
        style={colorStyle(track.color)}
        title={track.id}
      >
        {track.name}
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto no-scrollbar">
        {track.clips.map((c) => (
          <div
            key={nodeKey(c.id)}
            className={`${ROW} ${highlight(c.id === selectedPath)}`}
            style={colorStyle(c.color)}
            title={`${c.kind} · ${c.id}`}
          >
            {c.name || '(unnamed)'}
          </div>
        ))}
        {track.devices.map((d) => (
          <DeviceRow key={d.id} device={d} selectedPath={selectedPath} nodeKey={nodeKey} />
        ))}
      </div>
    </div>
  )
}

export default function Monitor({ instanceId }: UIProps) {
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<LiveState>
  const { snapshot, liveTracks, refreshing, refreshError, selection, selectionSeq, refresh } =
    instance.useStore()

  const selectedPath = selection?.maxPath ?? null

  return (
    <div className="h-full flex flex-col text-xs font-neon text-stone-100">
      <div className="flex items-baseline gap-3 px-3 py-1.5 shrink-0">
        <button
          onClick={() => void refresh()}
          disabled={refreshing}
          className="border border-stone-600 px-2 py-0.5 hover:bg-stone-800 disabled:opacity-50"
        >
          {refreshing ? 'refreshing…' : 'refresh'}
        </button>
        {snapshot && (
          <span className="text-stone-400 shrink-0">
            {snapshot.tempo} bpm · {liveTracks.length} tracks
          </span>
        )}
        {selection && (
          <span className="text-stone-400 truncate">
            selected: {selection.trackName}
            {selection.type === 'clip' ? ` › ${selection.name}` : ''}
            {selection.inArrangement ? ' (arrangement)' : ''}
          </span>
        )}
        {refreshError && (
          <span className="text-rose-400 truncate" title={refreshError}>
            bridge unreachable — is Live running with the Lily extension?
          </span>
        )}
      </div>

      {liveTracks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-stone-500 italic">
          {refreshing ? 'loading live set…' : 'no live set — refresh with Live open'}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-x-auto flex gap-1 px-3 pb-2">
          {liveTracks.map((t) => (
            <TrackColumn
              key={t.id}
              track={t}
              selectedPath={selectedPath}
              selectionSeq={selectionSeq}
            />
          ))}
        </div>
      )}
    </div>
  )
}
