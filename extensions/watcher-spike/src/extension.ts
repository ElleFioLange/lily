/**
 * Watcher Spike — standalone feasibility test for a polling "watcher bridge".
 *
 * It answers three questions WITHOUT wiring anything into Lily:
 *   1. Can we read Live's data model from a free-running background timer
 *      (i.e. OUTSIDE a command callback)?  -> the make-or-break unknown.
 *   2. Can we diff snapshots into deltas cheaply?
 *   3. Can the extension host a localhost server that an external app (Lily)
 *      would consume?  -> verify with `curl http://127.0.0.1:7878`.
 *
 * Watch results in two places while Live is open:
 *   - ExtensionHost.txt log (console.* output)
 *   - curl http://127.0.0.1:7878   (latest snapshot as JSON)
 *
 * The right-click "Watcher: Snapshot (command)" action on an Audio Track is a
 * KNOWN-GOOD baseline: reads from inside a command always work. If the timer
 * reads fail but the command read succeeds, the watcher bridge must be
 * "pull-on-request" instead of "free-running timer".
 */
import { initialize, type ActivationContext } from '@ableton-extensions/sdk'
import * as http from 'node:http'

const PORT = 7878
const POLL_MS = 1000

export function activate(activation: ActivationContext) {
  const context = initialize(activation, '1.0.0')
  const log = (...args: unknown[]) => console.log('[watcher]', ...args)

  // Only sync getters here — keeps each poll cheap and avoids the async
  // device-parameter value reads. (Param *values* would be a focused, on-demand
  // read in the real bridge, not part of the structural poll.)
  function readSnapshot() {
    const song = context.application.song
    const tracks = song.tracks.map((t) => ({
      name: t.name,
      mute: t.mute,
      solo: t.solo,
      arm: t.arm,
      devices: t.devices.map((d) => d.name),
      clips: t.clipSlots.map((s) => s.clip?.name ?? null)
    }))
    return {
      tempo: song.tempo,
      trackCount: tracks.length,
      sceneCount: song.scenes.length,
      tracks
    }
  }

  let tick = 0
  let lastSerialized = ''
  let latest: unknown = { status: 'starting', port: PORT }

  // --- (1)+(2) THE KEY TEST: read + diff from a background timer, no command ---
  const timer = setInterval(() => {
    tick++
    try {
      const snapshot = readSnapshot()
      const serialized = JSON.stringify(snapshot)
      const changed = serialized !== lastSerialized
      latest = { tick, at: new Date().toISOString(), ok: true, changed, snapshot }
      if (changed) {
        lastSerialized = serialized
        log(
          `tick ${tick}: CHANGED tempo=${snapshot.tempo} tracks=${snapshot.trackCount} ::`,
          snapshot.tracks.map((t) => t.name).join(' | ')
        )
      } else {
        log(`tick ${tick}: no change (tempo=${snapshot.tempo}, tracks=${snapshot.trackCount})`)
      }
    } catch (e) {
      latest = { tick, at: new Date().toISOString(), ok: false, error: String(e) }
      log(`tick ${tick}: BACKGROUND READ FAILED ->`, e)
    }
  }, POLL_MS)
  timer.unref?.()

  // --- (3) The bridge half: a localhost server Lily would later consume ---
  const server = http.createServer((_req, res) => {
    res.setHeader('content-type', 'application/json')
    res.setHeader('access-control-allow-origin', '*')
    res.end(JSON.stringify(latest, null, 2))
  })
  server.on('error', (e) => log('http server error ->', e))
  server.listen(PORT, '127.0.0.1', () =>
    log(`snapshot server listening on http://127.0.0.1:${PORT}`)
  )

  // --- Baseline: a known-good read from inside a command (for comparison) ---
  context.commands.registerCommand('watcher.snapshot', () => {
    try {
      log('command read OK ::', JSON.stringify(readSnapshot()))
    } catch (e) {
      log('command read FAILED ->', e)
    }
  })
  context.ui.registerContextMenuAction(
    'AudioTrack',
    'Watcher: Snapshot (command)',
    'watcher.snapshot'
  )

  log(`activated — polling every ${POLL_MS}ms, http on :${PORT}`)
}
