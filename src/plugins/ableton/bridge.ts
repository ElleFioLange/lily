/**
 * Client for the Lily extension's localhost bridge (extensions/lily).
 *
 * The extension serves a snapshot of the open Live Set at
 * http://127.0.0.1:7879 with a canonical Max/LOM path (`maxPath`) on every
 * node, and pushes "Show in Lily" selections over OSC (/lily/select).
 *
 * Wire types mirror extensions/lily/src/snapshot.ts + showInLily.ts. The
 * `toLiveTracks` mapper flattens the wire tree into the filetree shapes the
 * Ableton workspace UI uses (tracks → clips/devices → parameters), with
 * `maxPath` as each node's id — so highlighting a SelectionPayload is just
 * `node.id === selection.maxPath`.
 */
import type { OSCMessage } from 'src/types/osc-messages'

export const BRIDGE_URL = 'http://127.0.0.1:7879'

// ============================================================================
// Wire types (extensions/lily/src/snapshot.ts)
// ============================================================================

export type TrackKind = 'track' | 'return' | 'master'
export type ClipKind = 'midi' | 'audio' | 'clip'

export interface SnapshotParam {
  name: string
  maxPath: string
  min: number
  max: number
  isQuantized: boolean
  defaultValue: number
}

export interface SnapshotDevice {
  name: string
  maxPath: string
  parameters: SnapshotParam[]
}

export interface SnapshotClip {
  name: string
  maxPath: string
  kind: ClipKind
  /** Packed 0xRRGGBB int (use intToHexColor for CSS) */
  color: number
  looping: boolean
  muted: boolean
  startTime: number
  endTime: number
  duration: number
}

export interface SnapshotClipSlot {
  maxPath: string
  hasClip: boolean
  clip: SnapshotClip | null
}

export interface SnapshotMixer {
  maxPath: string
  volume: SnapshotParam
  panning: SnapshotParam
  sends: SnapshotParam[]
}

export interface SnapshotTrack {
  name: string
  maxPath: string
  kind: TrackKind
  mute: boolean
  solo: boolean
  arm: boolean
  devices: SnapshotDevice[]
  mixer: SnapshotMixer
  /** Session slots — empty for returns/master */
  clipSlots: SnapshotClipSlot[]
}

export interface SnapshotScene {
  name: string
  maxPath: string
  tempo: number
  signatureNumerator: number
  signatureDenominator: number
}

export interface SnapshotCuePoint {
  name: string
  maxPath: string
  time: number
}

export interface ProjectSnapshot {
  maxPath: 'live_set'
  tempo: number
  tracks: SnapshotTrack[]
  returnTracks: SnapshotTrack[]
  masterTrack: SnapshotTrack
  scenes: SnapshotScene[]
  cuePoints: SnapshotCuePoint[]
}

// ============================================================================
// Selection payload ("Show in Lily" — extensions/lily/src/showInLily.ts)
// ============================================================================

export interface SelectionPayload {
  type: 'track' | 'clip' | 'device'
  name: string
  maxPath: string
  trackName: string
  trackPath: string
  clipKind?: ClipKind
  /** Clip lives in the arrangement — maxPath falls back to its track */
  inArrangement?: boolean
}

// ============================================================================
// Filetree shapes (what the Ableton workspace UI renders)
// ============================================================================

export interface LiveParameter {
  /** maxPath — stable id + OSC-addressable target */
  id: string
  name: string
  min: number
  max: number
  isQuantized: boolean
  defaultValue: number
}

export interface LiveDevice {
  id: string
  name: string
  parameters: LiveParameter[]
}

export interface LiveClip {
  id: string
  name: string
  /** CSS hex, converted from the wire's packed int */
  color: string
  kind: ClipKind
}

export interface LiveTrack {
  id: string
  name: string
  /** Best-effort: the SDK exposes no track color — derived from the first clip */
  color: string
  clips: LiveClip[]
  devices: LiveDevice[]
}

// ============================================================================
// Mapping
// ============================================================================

const FALLBACK_COLOR = '#44403c' // stone-700

export const intToHexColor = (c: number): string =>
  '#' + ((c >>> 0) & 0xffffff).toString(16).padStart(6, '0')

const toLiveParameter = (p: SnapshotParam): LiveParameter => ({
  id: p.maxPath,
  name: p.name,
  min: p.min,
  max: p.max,
  isQuantized: p.isQuantized,
  defaultValue: p.defaultValue
})

const toLiveDevice = (d: SnapshotDevice): LiveDevice => ({
  id: d.maxPath,
  name: d.name,
  parameters: d.parameters.map(toLiveParameter)
})

const toLiveClip = (c: SnapshotClip): LiveClip => ({
  id: c.maxPath,
  name: c.name,
  color: intToHexColor(c.color),
  kind: c.kind
})

const toLiveTrack = (t: SnapshotTrack): LiveTrack => {
  const clips = t.clipSlots.flatMap((s) => (s.clip ? [toLiveClip(s.clip)] : []))
  return {
    id: t.maxPath,
    name: t.name,
    color: clips[0]?.color ?? FALLBACK_COLOR,
    clips,
    devices: t.devices.map(toLiveDevice)
  }
}

/** Regular tracks only — what the filetree shows. Empty slots are dropped. */
export const toLiveTracks = (snap: ProjectSnapshot): LiveTrack[] => snap.tracks.map(toLiveTrack)

// ============================================================================
// get-state-shape synthesis
// ============================================================================

/**
 * Synthesize the Workspace's get-state-shaped AbletonProject from the bridge
 * snapshot, making the bridge the single read source (M4L stays control-only).
 * Ids are synthetic but unique within one snapshot — selection equality and
 * findIndex lookups are all that consume them — and array indexes match LOM
 * order by construction, so generateLivePath emits correct Live paths.
 */
export function toAbletonProject(snap: ProjectSnapshot): AbletonProject {
  let nextId = 1
  const id = (): number => nextId++

  const toParam = (p: SnapshotParam, parent: number): AbletonDeviceParameter => ({
    id: id(),
    name: p.name,
    value: p.defaultValue,
    min: p.min,
    max: p.max,
    display_value: '',
    is_quantized: p.isQuantized,
    is_enabled: true,
    parent
  })

  const toDevice = (d: SnapshotDevice): AbletonDevice => {
    const deviceId = id()
    return {
      id: deviceId,
      name: d.name,
      class_display_name: d.name,
      is_active: true,
      parameters: d.parameters.map((p) => toParam(p, deviceId))
    }
  }

  const toClip = (c: SnapshotClip): AbletonClip => ({
    id: id(),
    name: c.name,
    color: c.color,
    is_playing: false,
    is_recording: false,
    is_triggered: false,
    length: c.duration,
    looping: c.looping,
    muted: c.muted
  })

  const toSlot = (s: SnapshotClipSlot, parent: number): AbletonClipSlot => ({
    id: id(),
    has_clip: s.hasClip,
    clip_data: s.clip ? toClip(s.clip) : null,
    is_playing: false,
    is_recording: false,
    is_triggered: false,
    parent
  })

  const toTrack = (t: SnapshotTrack): AbletonTrack => {
    const trackId = id()
    return {
      id: trackId,
      name: t.name,
      // tracks have no color in the SDK — borrow the first clip's
      color: t.clipSlots.find((s) => s.clip)?.clip?.color ?? 0x44403c,
      mute: t.mute,
      solo: t.solo,
      arm: t.arm,
      is_foldable: false,
      is_grouped: false,
      is_visible: true,
      clip_slots_data: t.clipSlots.map((s) => toSlot(s, trackId)),
      device_data: t.devices.map(toDevice)
    }
  }

  return {
    id: id(),
    track_data_arr: snap.tracks.map(toTrack),
    return_track_data_arr: snap.returnTracks.map(toTrack),
    master_track: toTrack(snap.masterTrack)
  }
}

// ============================================================================
// Fetchers & selection subscription
// ============================================================================

/** One Refresh = one fetch; the extension re-serializes the Set per request. */
export async function fetchSnapshot(): Promise<ProjectSnapshot> {
  const res = await fetch(`${BRIDGE_URL}/snapshot`)
  if (!res.ok) throw new Error(`bridge /snapshot failed: ${res.status}`)
  return (await res.json()) as ProjectSnapshot
}

/** Last "Show in Lily" payload, or null if none yet (or bridge unreachable). */
export async function fetchSelection(): Promise<SelectionPayload | null> {
  const res = await fetch(`${BRIDGE_URL}/selection`)
  if (!res.ok) throw new Error(`bridge /selection failed: ${res.status}`)
  const body = (await res.json()) as { selection: SelectionPayload | null }
  return body.selection
}

export interface AutonameResult {
  renamed: number
  skipped: number
  results: { path: string; ok: boolean; name?: string; reason?: string }[]
}

/** Rename session clips via the extension (one undoable transaction). */
export async function postAutoname(
  items: { path: string; name: string }[]
): Promise<AutonameResult> {
  // No content-type header on purpose: text/plain keeps this a "simple"
  // request so the browser skips the CORS preflight (the bridge parses the
  // body as JSON regardless).
  const res = await fetch(`${BRIDGE_URL}/autoname`, {
    method: 'POST',
    body: JSON.stringify({ items })
  })
  if (!res.ok) throw new Error(`bridge /autoname failed: ${res.status}`)
  return (await res.json()) as AutonameResult
}

const SELECT_ADDRESS = '/lily/select'

/**
 * Subscribe to "Show in Lily" pushes. Uses the OSC firehose (osc.onMessage) and
 * filters by address — main only forwards `osc:message`, not per-pattern events.
 * Note: the preload API has no working unsubscribe; call once (module/plugin init).
 */
export function onShowInLily(callback: (sel: SelectionPayload) => void): void {
  window.api.osc.onMessage((message: OSCMessage) => {
    if (message.address !== SELECT_ADDRESS) return
    try {
      callback(JSON.parse(String(message.args[0])) as SelectionPayload)
    } catch (e) {
      console.error('[ableton:bridge] bad /lily/select payload', e)
    }
  })
}
