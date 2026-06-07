import { useEffect, useRef, useState } from 'react'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin, UIProps } from 'src/types/plugins'
import { AbletonState } from '../store'
import { LiveDevice, LiveTrack } from '../bridge'
import { colorStyle } from './colors'

// Session-style monitor of the open Live Set, read from the extension bridge.
// One column per track: name header, clips, then devices (expandable to their
// parameters).
//
// Two kinds of "selected" live here:
//  - "Show in Lily" pushes from Live → left-border accent + pulse (maxPath match)
//  - click-selection for the Workspace's ConnectionForm → inset ring. Clicks
//    map the bridge node's maxPath indexes onto the M4L abletonProject objects
//    (both are LOM-index-ordered), since the form consumes those.

// shrink-0 matters: rows are flex children of a scrollable column — without it
// they compress into slivers once a column has more content than fits.
// NO `truncate` on the row itself (overflow:hidden would clip the highlight
// ripple) — labels truncate via an inner span instead.
const ROW = 'px-2 py-0.5 border-l-4 shrink-0 flex items-center gap-1 min-w-0'

/** Steady accent + one-shot pulse for the pushed node. `seq` changes per
 *  push, re-keying the animation so a repeat selection pulses again. */
const highlight = (selected: boolean) =>
  selected ? 'border-stone-100 animate-select-pulse' : 'border-transparent'

/** Inset ring for click-selection (feeds the Workspace connection form). */
const clickSel = (selected: boolean) => (selected ? 'ring-1 ring-inset ring-stone-100/80' : '')

const idx = (path: string, re: RegExp): number | null => {
  const m = path.match(re)
  return m ? Number(m[1]) : null
}

/** What the Workspace connection form needs from a click. */
interface Picker {
  track: (t: LiveTrack) => void
  clip: (t: LiveTrack, clipId: string) => void
  device: (t: LiveTrack, deviceId: string) => void
  param: (t: LiveTrack, deviceId: string, paramId: string) => void
  /** get-state ids of the currently click-selected objects, for the ring cue */
  ids: { track: number | null; slot: number | null; device: number | null; param: number | null }
  /** maps a bridge track to its get-state counterpart (null if M4L not connected) */
  mapTrack: (t: LiveTrack) => AbletonTrack | null
}

function DeviceRow({
  track,
  device,
  selectedPath,
  nodeKey,
  pick
}: {
  track: LiveTrack
  device: LiveDevice
  selectedPath: string | null
  nodeKey: (id: string) => string
  pick: Picker
}) {
  const [open, setOpen] = useState(false)
  const mapped = pick.mapTrack(track)
  const deviceIdx = idx(device.id, /devices (\d+)$/)
  const mappedDevice = deviceIdx !== null ? (mapped?.device_data?.[deviceIdx] ?? null) : null

  return (
    <div className="flex flex-col gap-1 shrink-0">
      <div
        key={nodeKey(device.id)}
        onClick={() => pick.device(track, device.id)}
        className={`${ROW} ${highlight(device.id === selectedPath)} ${clickSel(
          mappedDevice !== null && mappedDevice.id === pick.ids.device
        )} bg-stone-800 text-stone-300 cursor-pointer ${open ? 'sticky top-0 z-[5]' : ''}`}
        title={device.id}
      >
        <span
          onClick={(e) => {
            e.stopPropagation()
            setOpen((o) => !o)
          }}
          className="shrink-0 w-3 text-[10px] opacity-70 hover:opacity-100 cursor-pointer"
          title={open ? 'Collapse parameters' : 'Expand parameters'}
        >
          {open ? '▾' : '▸'}
        </span>
        <span className="truncate">◆ {device.name}</span>
        <span className="ml-auto shrink-0 text-[10px] text-stone-500">
          {device.parameters.length}
        </span>
      </div>

      {open &&
        device.parameters.map((p) => {
          const paramIdx = idx(p.id, /parameters (\d+)$/)
          const mappedParam =
            paramIdx !== null ? (mappedDevice?.parameters?.[paramIdx] ?? null) : null
          return (
            <div
              key={nodeKey(p.id)}
              onClick={() => pick.param(track, device.id, p.id)}
              className={`${ROW} ${highlight(p.id === selectedPath)} ${clickSel(
                mappedParam !== null && mappedParam.id === pick.ids.param
              )} ml-3 bg-stone-900 text-stone-400 cursor-pointer`}
              title={`${p.min}–${p.max}${p.isQuantized ? ' · quantized' : ''} · default ${p.defaultValue} · ${p.id}`}
            >
              <span className="truncate">◇ {p.name}</span>
            </div>
          )
        })}
    </div>
  )
}

function TrackColumn({
  track,
  selectedPath,
  selectionSeq,
  pick
}: {
  track: LiveTrack
  selectedPath: string | null
  selectionSeq: number
  pick: Picker
}) {
  const ref = useRef<HTMLDivElement>(null)
  const mapped = pick.mapTrack(track)
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
        onClick={() => pick.track(track)}
        className={`px-2 py-1 font-bold border-l-4 shrink-0 cursor-pointer flex items-center min-w-0 ${highlight(
          track.id === selectedPath
        )} ${clickSel(mapped !== null && mapped.id === pick.ids.track)}`}
        style={colorStyle(track.color)}
        title={track.id}
      >
        <span className="truncate">{track.name}</span>
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto no-scrollbar">
        {track.clips.map((c) => {
          const slotIdx = idx(c.id, /clip_slots (\d+) clip$/)
          const mappedSlot = slotIdx !== null ? (mapped?.clip_slots_data?.[slotIdx] ?? null) : null
          return (
            <div
              key={nodeKey(c.id)}
              onClick={() => pick.clip(track, c.id)}
              className={`${ROW} ${highlight(c.id === selectedPath)} ${clickSel(
                mappedSlot !== null && mappedSlot.id === pick.ids.slot
              )} cursor-pointer`}
              style={colorStyle(c.color)}
              title={`${c.kind} · ${c.id}`}
            >
              <span className="truncate">{c.name || '(unnamed)'}</span>
            </div>
          )
        })}
        {track.devices.map((d) => (
          <DeviceRow
            key={d.id}
            track={track}
            device={d}
            selectedPath={selectedPath}
            nodeKey={nodeKey}
            pick={pick}
          />
        ))}
      </div>
    </div>
  )
}

export default function Monitor({ instanceId }: UIProps) {
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<AbletonState>
  const {
    snapshot,
    liveTracks,
    refreshing,
    refreshError,
    selection,
    selectionSeq,
    refresh,
    abletonProject,
    selectedTrack,
    selectedClipSlot,
    selectedDevice,
    selectedParam,
    setSelectedTrack,
    setSelectedClipSlot,
    setSelectedDevice,
    setSelectedParam
  } = instance.useStore()

  const selectedPath = selection?.maxPath ?? null

  // --- Click-selection: bridge node → get-state object (for the Workspace) ---
  const project = abletonProject as AbletonProject | Record<string, never>
  const mapTrack = (t: LiveTrack): AbletonTrack | null => {
    const i = idx(t.id, /^live_set tracks (\d+)/)
    return i !== null ? (project.track_data_arr?.[i] ?? null) : null
  }

  const pick: Picker = {
    mapTrack,
    ids: {
      track: selectedTrack?.id ?? null,
      slot: selectedClipSlot?.id ?? null,
      device: selectedDevice?.id ?? null,
      param: selectedParam?.id ?? null
    },
    track: (t) => {
      const mapped = mapTrack(t)
      if (mapped) setSelectedTrack(mapped)
    },
    clip: (t, clipId) => {
      const mapped = mapTrack(t)
      const slotIdx = idx(clipId, /clip_slots (\d+) clip$/)
      const slot = slotIdx !== null ? mapped?.clip_slots_data?.[slotIdx] : null
      if (mapped && slot) {
        setSelectedTrack(mapped) // clears slot/device/param
        setSelectedClipSlot(slot)
      }
    },
    device: (t, deviceId) => {
      const mapped = mapTrack(t)
      const deviceIdx = idx(deviceId, /devices (\d+)$/)
      const device = deviceIdx !== null ? mapped?.device_data?.[deviceIdx] : null
      if (mapped && device) {
        setSelectedTrack(mapped)
        setSelectedDevice(device)
      }
    },
    param: (t, deviceId, paramId) => {
      const mapped = mapTrack(t)
      const deviceIdx = idx(deviceId, /devices (\d+)$/)
      const device = deviceIdx !== null ? mapped?.device_data?.[deviceIdx] : null
      const paramIdx = idx(paramId, /parameters (\d+)$/)
      const param = paramIdx !== null ? device?.parameters?.[paramIdx] : null
      if (mapped && device && param) {
        setSelectedTrack(mapped)
        setSelectedDevice(device)
        setSelectedParam(param)
      }
    }
  }

  const m4lConnected = (project.track_data_arr?.length ?? 0) > 0

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
        {!m4lConnected && liveTracks.length > 0 && (
          <span className="text-stone-600 truncate">
            m4l not connected — clicks can't drive the connection form yet
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
              pick={pick}
            />
          ))}
        </div>
      )}
    </div>
  )
}
