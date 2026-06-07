import { useEffect, useRef, useState } from 'react'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin, UIProps } from 'src/types/plugins'
import { PoiesisState } from '@renderer/surfaces/poiesis/store'
import { AbletonState } from '../store'
import { LiveDevice, LiveTrack, postAutoname } from '../bridge'
import { deriveAutonameItems } from '../autoname'
import { colorStyle } from './colors'

// Session-style monitor of the open Live Set, read from the extension bridge.
// One column per track: name header, clips, then devices (expandable to their
// parameters).
//
// Two kinds of "selected" live here, both shown as the white left border:
//  - "Show in Lily" pushes from Live (maxPath match) — border + one-shot pulse
//  - click-selection for the Workspace's ConnectionForm — steady border. Clicks
//    map the bridge node's maxPath indexes onto the abletonProject objects
//    (synthesized from the same snapshot, so indexes always line up).

// shrink-0 matters: rows are flex children of a scrollable column — without it
// they compress into slivers once a column has more content than fits.
const ROW = 'relative px-2 py-0.5 shrink-0 flex items-center gap-1 min-w-0'

/** Selection accent: an overlaid left bar — absolute, so unselected rows sit
 *  flush with no reserved border gap. A "Show in Lily" push also pulses the
 *  row (nodeKey re-keys the animation per push); click-selection (feeds the
 *  Workspace connection form) shows the steady bar alone. */
const pulse = (pushed: boolean) => (pushed ? 'animate-select-pulse' : '')

function Accent({ on }: { on: boolean }) {
  return on ? (
    <span className="absolute inset-y-0 left-0 w-1 bg-stone-100 pointer-events-none" />
  ) : null
}

/** Slot render plan: clips as rows, consecutive empties collapsed into one
 *  gap row, trailing empties (after the last clip) dropped. */
type SlotSegment = { kind: 'clip' | 'gap'; start: number; end: number }
function segmentSlots(slots: { clip: unknown | null }[]): SlotSegment[] {
  let lastClip = -1
  slots.forEach((s, i) => {
    if (s.clip) lastClip = i
  })
  const segments: SlotSegment[] = []
  for (let i = 0; i <= lastClip; i++) {
    if (slots[i].clip) {
      segments.push({ kind: 'clip', start: i, end: i })
    } else if (segments.length && segments[segments.length - 1].kind === 'gap') {
      segments[segments.length - 1].end = i
    } else {
      segments.push({ kind: 'gap', start: i, end: i })
    }
  }
  return segments
}

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
        data-maxpath={device.id}
        onClick={() => pick.device(track, device.id)}
        onDoubleClick={() => setOpen((o) => !o)}
        className={`${ROW} ${pulse(device.id === selectedPath)} bg-stone-800 text-stone-300 cursor-pointer ${open ? 'sticky top-0 z-[5]' : ''}`}
        title={`${device.id} — click selects · double-click or caret expands`}
      >
        <Accent
          on={
            device.id === selectedPath ||
            (mappedDevice !== null && mappedDevice.id === pick.ids.device)
          }
        />
        <span className="truncate">{device.name}</span>
        <span className="ml-auto shrink-0 text-[10px] text-stone-500">
          {device.parameters.length}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setOpen((o) => !o)
          }}
          onDoubleClick={(e) => e.stopPropagation()}
          className="shrink-0 w-5 -mr-2 self-stretch flex items-center justify-center text-stone-100 bg-stone-700 hover:bg-stone-600 outline-none"
          title={open ? 'Collapse parameters' : 'Expand parameters'}
        >
          {open ? '▾' : '▸'}
        </button>
      </div>

      {open &&
        device.parameters.map((p) => {
          const paramIdx = idx(p.id, /parameters (\d+)$/)
          const mappedParam =
            paramIdx !== null ? (mappedDevice?.parameters?.[paramIdx] ?? null) : null
          return (
            <div
              key={nodeKey(p.id)}
              data-maxpath={p.id}
              onClick={() => pick.param(track, device.id, p.id)}
              className={`${ROW} ${pulse(p.id === selectedPath)} ml-3 bg-stone-900 text-stone-400 cursor-pointer`}
              title={`${p.min}–${p.max}${p.isQuantized ? ' · quantized' : ''} · default ${p.defaultValue} · ${p.id}`}
            >
              <Accent
                on={
                  p.id === selectedPath ||
                  (mappedParam !== null && mappedParam.id === pick.ids.param)
                }
              />
              <span className="truncate">{p.name}</span>
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
      track.slots.some((sl) => sl.id === selectedPath) ||
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
        data-maxpath={track.id}
        onClick={() => pick.track(track)}
        className={`relative px-2 py-1 font-bold shrink-0 cursor-pointer flex items-center min-w-0 ${pulse(
          track.id === selectedPath
        )}`}
        style={colorStyle(track.color)}
        title={track.id}
      >
        <Accent on={track.id === selectedPath || (mapped !== null && mapped.id === pick.ids.track)} />
        <span className="truncate">{track.name}</span>
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto no-scrollbar">
        {segmentSlots(track.slots).map((seg) => {
          if (seg.kind === 'gap') {
            // A run of consecutive empty slots collapses into one row; runs
            // after the last clip are dropped entirely (see segmentSlots).
            const single = seg.start === seg.end
            const slot = track.slots[seg.start]
            const mappedSlot = mapped?.clip_slots_data?.[seg.start] ?? null
            const picked = single && mappedSlot !== null && mappedSlot.id === pick.ids.slot
            return (
              <div
                key={slot.id}
                data-maxpath={single ? slot.id : undefined}
                onClick={single ? () => pick.clip(track, slot.id) : undefined}
                className={`${ROW} bg-stone-900 text-stone-700 ${single ? 'cursor-pointer hover:text-stone-500' : ''}`}
                title={
                  single
                    ? `empty slot ${seg.start} · ${slot.id}`
                    : `empty slots ${seg.start}–${seg.end}`
                }
              >
                <Accent on={picked} />
                <span className="truncate">{single ? '·' : `‥ ${seg.start}–${seg.end}`}</span>
              </div>
            )
          }
          const slot = track.slots[seg.start]
          const c = slot.clip!
          const mappedSlot = mapped?.clip_slots_data?.[slot.index] ?? null
          const picked = mappedSlot !== null && mappedSlot.id === pick.ids.slot
          return (
            <div
              key={nodeKey(slot.id)}
              data-maxpath={slot.id}
              onClick={() => pick.clip(track, slot.id)}
              className={`${ROW} ${pulse(slot.id === selectedPath)} cursor-pointer`}
              style={colorStyle(c.color)}
              title={`${c.kind} · slot ${slot.index} · ${slot.id}`}
            >
              <Accent on={slot.id === selectedPath || picked} />
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

  // Selective subscriptions — subscribing to the whole store re-rendered this
  // entire tree on every store write (deadly during get-state streaming).
  const snapshot = instance.useStore((s) => s.snapshot)
  const liveTracks = instance.useStore((s) => s.liveTracks)
  const refreshing = instance.useStore((s) => s.refreshing)
  const refreshError = instance.useStore((s) => s.refreshError)
  const selection = instance.useStore((s) => s.selection)
  const selectionSeq = instance.useStore((s) => s.selectionSeq)
  const abletonProject = instance.useStore((s) => s.abletonProject)
  const selectedTrack = instance.useStore((s) => s.selectedTrack)
  const selectedClipSlot = instance.useStore((s) => s.selectedClipSlot)
  const selectedDevice = instance.useStore((s) => s.selectedDevice)
  const selectedParam = instance.useStore((s) => s.selectedParam)
  // Actions are stable — no subscription needed.
  const { refresh, setSelectedTrack, setSelectedClipSlot, setSelectedDevice, setSelectedParam } =
    instance.useStore.getState()

  const selectedPath = selection?.maxPath ?? null

  // --- Autoname: name clips in Live after the config's clip-connected keywords
  const [autonameStatus, setAutonameStatus] = useState<string | null>(null)
  const [autonameDetail, setAutonameDetail] = useState<string | null>(null)
  const handleAutoname = async (): Promise<void> => {
    const poiesis = Object.values(usePluginsStore.getState().active).find(
      (p) => p.manifest.id === 'poiesis'
    ) as ActivePlugin<PoiesisState> | undefined
    const config = poiesis?.useStore.getState().parsedConfig ?? null
    const { items, skipped } = deriveAutonameItems(config)
    if (items.length === 0) {
      setAutonameStatus(
        !poiesis
          ? 'load a Poiesis plugin first'
          : skipped
            ? `nothing nameable (${skipped} unresolvable)`
            : 'no clip connections in config'
      )
      return
    }
    setAutonameStatus('naming…')
    try {
      const result = await postAutoname(items)
      const totalSkipped = result.skipped + skipped
      console.table(result.results)
      const reasons = result.results
        .filter((r) => !r.ok)
        .map((r) => `${r.path} — ${r.reason}`)
        .join('\n')
      setAutonameDetail(reasons || null)
      setAutonameStatus(
        `named ${result.renamed}${totalSkipped ? ` · ${totalSkipped} no-op` : ''}`
      )
      void refresh()
    } catch {
      setAutonameDetail(null)
      setAutonameStatus('autoname failed — bridge unreachable?')
    }
  }

  // --- Ripple overlay: the expanding rectangle is drawn on a fixed-position
  // layer measured off the target row, so scroll containers can't clip it.
  const rootRef = useRef<HTMLDivElement>(null)
  const [ripple, setRipple] = useState<{
    key: number
    left: number
    top: number
    width: number
    height: number
  } | null>(null)

  useEffect(() => {
    if (!selectedPath) return
    // Measure after the child effects have scrolled the target into view.
    const raf = requestAnimationFrame(() => {
      const el = rootRef.current?.querySelector(`[data-maxpath="${CSS.escape(selectedPath)}"]`)
      if (!el) return
      const r = el.getBoundingClientRect()
      setRipple({ key: selectionSeq, left: r.left, top: r.top, width: r.width, height: r.height })
    })
    // 350ms delay + 600ms animation + slack, then unmount the layer.
    const timer = setTimeout(() => setRipple(null), 1100)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [selectedPath, selectionSeq])

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

  return (
    <div ref={rootRef} className="h-full flex flex-col text-xs font-neon text-stone-100">
      {ripple && (
        <div
          key={ripple.key}
          className="select-ripple-overlay"
          style={{
            left: ripple.left,
            top: ripple.top,
            width: ripple.width,
            height: ripple.height
          }}
        />
      )}
      <div className="flex items-baseline gap-3 px-3 py-1.5 shrink-0">
        <button
          onClick={() => void refresh()}
          disabled={refreshing}
          className="border border-stone-600 px-2 py-0.5 hover:bg-stone-800 disabled:opacity-50"
        >
          {refreshing ? 'refreshing…' : 'refresh'}
        </button>
        <button
          onClick={() => void handleAutoname()}
          className="border border-stone-600 px-2 py-0.5 hover:bg-stone-800"
          title="Name clips in Live after the config's clip-connected keywords"
        >
          autoname
        </button>
        {autonameStatus && (
          <span
            className={`text-stone-400 shrink-0 ${autonameDetail ? 'cursor-help underline decoration-dotted' : ''}`}
            title={autonameDetail ?? undefined}
          >
            {autonameStatus}
          </span>
        )}
        {snapshot && (
          <span className="text-stone-400 shrink-0">
            {snapshot.tempo} bpm · {liveTracks.length} tracks
          </span>
        )}
        {selection && (
          <span className="text-stone-400 truncate">
            selected: {selection.trackName}
            {selection.type !== 'track' ? ` › ${selection.name}` : ''}
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
              pick={pick}
            />
          ))}
        </div>
      )}
    </div>
  )
}
