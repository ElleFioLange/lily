import {
  AudioClip,
  Clip,
  DataModelObject,
  Device,
  MidiClip,
  Track,
  type ExtensionContext,
  type Handle
} from '@ableton-extensions/sdk'

type Ctx = ExtensionContext<'1.0.0'>
const log = (...a: unknown[]) => console.log('[lily:show]', ...a)

/**
 * Payload sent to Lily when the user right-clicks "Show in Lily" on a track or
 * clip. `maxPath` uses the same Max/LOM grammar as snapshot.ts, so the monitor
 * pane can highlight by matching maxPath against its snapshot tree.
 */
export interface SelectionPayload {
  type: 'track' | 'clip' | 'device'
  name: string
  maxPath: string
  trackName: string
  trackPath: string
  clipKind?: 'midi' | 'audio' | 'clip'
  /** Clip lives in the arrangement (no session-slot path) — maxPath falls back to its track. */
  inArrangement?: boolean
}

const clipKindOf = (c: Clip<'1.0.0'>): 'midi' | 'audio' | 'clip' =>
  c instanceof MidiClip ? 'midi' : c instanceof AudioClip ? 'audio' : 'clip'

/**
 * Locate the clicked object in the song tree by handle id and derive its
 * positional Max path ("looking back" for the indexes, same as the snapshot).
 */
function locate(ctx: Ctx, handle: Handle): SelectionPayload | null {
  const obj = ctx.getObjectFromHandle(handle, DataModelObject)
  const song = ctx.application.song
  const id = obj.handle.id

  if (obj instanceof Track) {
    const i = song.tracks.findIndex((t) => t.handle.id === id)
    if (i < 0) return null // returns/master don't get these context scopes
    const trackPath = `live_set tracks ${i}`
    return { type: 'track', name: obj.name, maxPath: trackPath, trackName: obj.name, trackPath }
  }

  if (obj instanceof Device) {
    // Only DrumRack/Simpler have context-menu scopes, but any Device resolves.
    for (let i = 0; i < song.tracks.length; i++) {
      const t = song.tracks[i]
      const k = t.devices.findIndex((d) => d.handle.id === id)
      if (k >= 0) {
        const trackPath = `live_set tracks ${i}`
        return {
          type: 'device',
          name: obj.name,
          maxPath: `${trackPath} devices ${k}`,
          trackName: t.name,
          trackPath
        }
      }
    }
    return null
  }

  if (obj instanceof Clip) {
    for (let i = 0; i < song.tracks.length; i++) {
      const t = song.tracks[i]
      const trackPath = `live_set tracks ${i}`
      const j = t.clipSlots.findIndex((s) => s.clip?.handle.id === id)
      if (j >= 0) {
        return {
          type: 'clip',
          name: obj.name,
          maxPath: `${trackPath} clip_slots ${j} clip`,
          trackName: t.name,
          trackPath,
          clipKind: clipKindOf(obj)
        }
      }
      // Arrangement clips have no session-slot path — highlight the track.
      if (t.arrangementClips.some((c) => c.handle.id === id)) {
        return {
          type: 'clip',
          name: obj.name,
          maxPath: trackPath,
          trackName: t.name,
          trackPath,
          clipKind: clipKindOf(obj),
          inArrangement: true
        }
      }
    }
    return null
  }

  return null
}

/**
 * Right-click → "Show in Lily" on tracks and clips. Resolves the clicked
 * object to a SelectionPayload and hands it to `onSelect` (which pushes it to
 * Lily over OSC and exposes it on the bridge).
 */
export function registerShowInLily(ctx: Ctx, onSelect: (sel: SelectionPayload) => void): void {
  ctx.commands.registerCommand('lily.showInLily', (handle: unknown) => {
    try {
      const sel = locate(ctx, handle as Handle)
      if (!sel) {
        log('could not locate clicked object in the song tree')
        return
      }
      log(`select ${sel.type} "${sel.name}" → ${sel.maxPath}`)
      onSelect(sel)
    } catch (e) {
      log('failed:', e)
    }
  })

  // Devices: Live only exposes context-menu scopes for DrumRack and Simpler —
  // there is no generic Device scope and none for parameters.
  for (const scope of [
    'AudioTrack',
    'MidiTrack',
    'AudioClip',
    'MidiClip',
    'DrumRack',
    'Simpler'
  ] as const) {
    ctx.ui
      .registerContextMenuAction(scope, 'Show in Lily', 'lily.showInLily')
      .then(() => log(`context action registered (${scope})`))
      .catch((e) => log(`context action FAILED (${scope}):`, e))
  }
}
