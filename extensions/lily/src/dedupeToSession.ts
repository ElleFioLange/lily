import type { Clip, ExtensionContext, Track } from '@ableton-extensions/sdk'
import { clipKey } from './util.js'
import { recreateInSlot } from './placeClip.js'

type Ctx = ExtensionContext<'1.0.0'>
type Song = Ctx['application']['song']
const log = (...a: unknown[]) => console.log('[lily:dedupe]', ...a)

/** First scene index where every track's slot is empty, else scene count. */
function firstEmptyScene(song: Song): number {
  const tracks = song.tracks
  for (let i = 0; i < song.scenes.length; i++) {
    if (tracks.every((t) => (t.clipSlots[i]?.clip ?? null) === null)) return i
  }
  return song.scenes.length
}

/** Unique clips for one track, in arrangement order, first occurrence wins. */
function uniqueClips(track: Track<'1.0.0'>): Clip<'1.0.0'>[] {
  const seen = new Set<string>()
  const out: Clip<'1.0.0'>[] = []
  for (const clip of [...track.arrangementClips].sort((a, b) => a.startTime - b.startTime)) {
    const key = clipKey(clip)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(clip)
  }
  return out
}

async function run(ctx: Ctx, update: (t: string, p?: number) => Promise<void>): Promise<void> {
  const song = ctx.application.song
  const tracks = song.tracks

  await update('Scanning arrangement…', 15)
  const perTrack = tracks.map(uniqueClips)
  if (perTrack.every((u) => u.length === 0)) {
    log('no arrangement clips found')
    return
  }

  const startScene = firstEmptyScene(song)
  log(`starting at scene ${startScene + 1}`)

  let placed = 0
  let failed = 0
  for (let t = 0; t < tracks.length; t++) {
    const track = tracks[t]!
    const clips = perTrack[t]!
    let cursor = startScene // per-track scene cursor; skips occupied slots

    for (let i = 0; i < clips.length; i++) {
      // Advance to the next empty slot, creating scenes on demand.
      while (cursor < song.scenes.length && (track.clipSlots[cursor]?.clip ?? null) !== null)
        cursor++
      while (cursor >= song.scenes.length) await song.createScene(song.scenes.length)

      const slot = track.clipSlots[cursor]
      if (slot) {
        try {
          await recreateInSlot(slot, clips[i]!, `${track.name} ${i + 1}`)
          placed++
        } catch (e) {
          failed++
          log(`skip ${track.name} clip ${i + 1}: ${String(e)}`)
        }
      }
      cursor++
    }
    await update(`Placed ${placed} clip(s)…`, 30 + Math.round((t / tracks.length) * 65))
  }

  log(`done — placed ${placed}, failed ${failed}, from scene ${startScene + 1}`)
}

export function registerDedupeToSession(ctx: Ctx): void {
  ctx.commands.registerCommand('lily.dedupeToSession', () => {
    // .catch is essential: an unhandled rejection here crashes the Extension Host.
    ctx.ui
      .withinProgressDialog('Lily — Dedupe to Session', { progress: 0 }, async (update) => {
        await run(ctx, update)
        await update('Done', 100)
      })
      .catch((e) => log('failed:', e))
  })

  void ctx.ui.registerContextMenuAction('AudioTrack', 'Dedupe to Session', 'lily.dedupeToSession')
  void ctx.ui.registerContextMenuAction('MidiTrack', 'Dedupe to Session', 'lily.dedupeToSession')
}
