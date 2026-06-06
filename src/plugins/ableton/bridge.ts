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
  type: 'track' | 'clip'
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
