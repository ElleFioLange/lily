/**
 * Lily — Ableton Live extension.
 *
 * On-command tools (right-click any track):
 *   - Mark Inflections : analyzes the arrangement and drops locators at section
 *                        boundaries + risers/fills (4/4, structural pass).
 *   - Dedupe to Session: collects unique arrangement clips per track and lays
 *                        them into Session view from the first empty scene,
 *                        autonamed. Non-destructive; audio best-effort.
 *   - Reconstruct to Session: rebuilds the arrangement as a labeled,
 *                        energy-colored Session grid (one scene per section).
 *   - Show in Lily     : (also on clips) pushes the clicked object's identity
 *                        to the Lily app over OSC so its Ableton monitor pane
 *                        can highlight it.
 *
 * Always-on localhost bridge (Lily's read path, http://127.0.0.1:7879):
 *   GET  /snapshot  — full project tree, a Max/LOM path on every node
 *                     (re-serialized per request — this is Lily's "Refresh")
 *   GET  /selection — last "Show in Lily" payload (null until first use)
 *   POST /autoname  — { items: [{ path, name }] } renames session clips
 *                     (Lily derives names from the Poiesis config keywords)
 *
 * See ../../docs/ABLETON_EXTENSION.md for capabilities/limits this is built on.
 */
import { initialize, type ActivationContext } from '@ableton-extensions/sdk'
import * as http from 'node:http'
import { registerMarkInflections } from './markInflections.js'
import { registerDedupeToSession } from './dedupeToSession.js'
import { registerReconstructToSession } from './reconstructToSession.js'
import { registerShowInLily, type SelectionPayload } from './showInLily.js'
import { serializeSong } from './snapshot.js'
import { sendOscStrings } from './osc.js'

const BRIDGE_PORT = 7879
/** Lily's OSC server (src/main/index.ts — Electron receives on 5460). */
const LILY_OSC_PORT = 5460

export function activate(activation: ActivationContext) {
  const context = initialize(activation, '1.0.0')

  registerMarkInflections(context)
  registerDedupeToSession(context)
  registerReconstructToSession(context)

  // --- Show in Lily: context menu → OSC push + bridge state ------------------
  let latestSelection: SelectionPayload | null = null
  registerShowInLily(context, (sel) => {
    latestSelection = sel
    // One JSON string arg; Lily side: window.api.osc.on('/lily/select', ...)
    sendOscStrings('/lily/select', [JSON.stringify(sel)], LILY_OSC_PORT)
  })

  // --- Localhost bridge -------------------------------------------------------
  // /snapshot + /selection are always on (Lily's read path). The command-trigger
  // routes are a dev convenience, opt-in via LILY_DEV_HARNESS=1 so production
  // can't fire commands over HTTP.
  const devHarness = process.env.LILY_DEV_HARNESS === '1'
  const bigintSafe = (_k: string, v: unknown) => (typeof v === 'bigint' ? Number(v) : v)

  const server = http.createServer((req, res) => {
    res.setHeader('content-type', 'application/json')
    res.setHeader('access-control-allow-origin', '*') // Lily renderer fetches from a file:// origin
    const url = req.url ?? '/'

    // CORS preflight (Lily's renderer fetches cross-origin).
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS')
      res.setHeader('access-control-allow-headers', 'content-type')
      res.end()
      return
    }

    // POST /insert-audio-effect — insert External Audio Effect on a track.
    // Body: { trackPath: string, audioChannel: number }
    // Inserts at the end of the device chain, sets Dry/Wet to 0 and Audio To to audioChannel.
    if (req.method === 'POST' && url.startsWith('/insert-audio-effect')) {
      let body = ''
      req.on('data', (chunk) => (body += chunk))
      req.on('end', () => {
        void (async () => {
          try {
            const { trackPath, audioChannel } = JSON.parse(body) as {
              trackPath: string
              audioChannel: number
            }
            const song = context.application.song
            const m = trackPath.match(/^live_set (return_)?tracks (\d+)/)
            if (!m) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'invalid trackPath' }))
              console.log('invalid track path')
              return
            }
            const isReturn = !!m[1]
            const idx = Number(m[2])
            const track = isReturn ? song.returnTracks[idx] : song.tracks[idx]
            if (!track) {
              res.statusCode = 404
              res.end(JSON.stringify({ error: 'track not found' }))
              console.log('track not found')
              return
            }
            const insertIdx = track.devices.length
            const device = await track.insertDevice('External Audio Effect', insertIdx)
            for (const param of device.parameters) {
              if (param.name === 'Dry/Wet') {
                await param.setValue(0)
              }
            }
            console.log(
              `[lily] insert-audio-effect: track ${idx}, channel=${audioChannel}, device=${device.name}`
            )
            res.end(
              JSON.stringify({
                ok: true,
                notice: `External Audio Effect inserted. Please manually set "Audio To" to channel ${audioChannel + 1} in Ableton.`
              })
            )
          } catch (e) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: String(e) }))
          }
        })()
      })
      return
    }

    // POST /autoname — rename tracks and session clips.
    // Body: { items: [{ path, name }] } where path is "live_set tracks N"
    // (track rename) or "live_set tracks N clip_slots M clip" (clip rename).
    // One undoable transaction; empty slots / unsupported paths are no-ops.
    if (req.method === 'POST' && url.startsWith('/autoname')) {
      let body = ''
      req.on('data', (chunk) => (body += chunk))
      req.on('end', () => {
        try {
          const { items } = JSON.parse(body) as { items: { path: string; name: string }[] }
          const song = context.application.song
          const results = context.withinTransaction(() =>
            items.map(({ path, name }) => {
              const clipMatch = path.match(/^live_set tracks (\d+) clip_slots (\d+) clip$/)
              if (clipMatch) {
                const clip =
                  song.tracks[Number(clipMatch[1])]?.clipSlots?.[Number(clipMatch[2])]?.clip
                if (!clip) return { path, ok: false as const, reason: 'empty slot' }
                clip.name = name
                return { path, ok: true as const, name }
              }
              const trackMatch = path.match(/^live_set tracks (\d+)$/)
              if (trackMatch) {
                const track = song.tracks[Number(trackMatch[1])]
                if (!track) return { path, ok: false as const, reason: 'no such track' }
                track.name = name
                return { path, ok: true as const, name }
              }
              return { path, ok: false as const, reason: 'unsupported path' }
            })
          )
          const renamed = results.filter((r) => r.ok).length
          console.log(`[lily] autoname: renamed ${renamed}/${items.length} clip(s)`)
          res.end(
            JSON.stringify({ renamed, skipped: results.length - renamed, results }, bigintSafe, 2)
          )
        } catch (e) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(e) }))
        }
      })
      return
    }

    try {
      if (url.startsWith('/snapshot')) {
        // Full project tree with a Max/LOM path on every node — the read path
        // that powers keyword→target wiring. See snapshot.ts.
        const song = context.application.song
        res.end(JSON.stringify(serializeSong(song), bigintSafe, 2))
      } else if (url.startsWith('/selection')) {
        res.end(JSON.stringify({ selection: latestSelection }, bigintSafe, 2))
      } else if (devHarness && url.startsWith('/mark')) {
        context.commands.executeCommand('lily.markInflections')
        res.end(JSON.stringify({ ok: true, ran: 'markInflections' }))
      } else if (devHarness && url.startsWith('/dedupe')) {
        context.commands.executeCommand('lily.dedupeToSession')
        res.end(JSON.stringify({ ok: true, ran: 'dedupeToSession' }))
      } else if (devHarness && url.startsWith('/reconstruct')) {
        context.commands.executeCommand('lily.reconstructToSession')
        res.end(JSON.stringify({ ok: true, ran: 'reconstructToSession' }))
      } else if (devHarness && url.startsWith('/state')) {
        const song = context.application.song
        res.end(
          JSON.stringify(
            {
              tempo: song.tempo,
              sceneCount: song.scenes.length,
              scenes: song.scenes.map((s) => s.name),
              cuePoints: song.cuePoints.map((c) => ({
                name: c.name,
                beat: c.time,
                bar: c.time / 4 + 1
              })),
              tracks: song.tracks.map((t) => ({
                name: t.name,
                arrangementClips: t.arrangementClips.length,
                session: t.clipSlots.map((s) => s.clip?.name ?? null).filter(Boolean)
              }))
            },
            bigintSafe,
            2
          )
        )
      } else {
        res.statusCode = 404
        const routes = devHarness
          ? '/snapshot /selection /autoname /insert-audio-effect /mark /dedupe /reconstruct /state'
          : '/snapshot /selection /autoname /insert-audio-effect'
        res.end(JSON.stringify({ error: `try ${routes}` }))
      }
    } catch (e) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: String(e) }))
    }
  })
  server.on('error', (e) => console.log('[lily] bridge error', e))
  server.listen(BRIDGE_PORT, '127.0.0.1', () =>
    console.log(
      `[lily] bridge on http://127.0.0.1:${BRIDGE_PORT} (/snapshot /selection /autoname /insert-audio-effect${devHarness ? ' + dev: /mark /dedupe /reconstruct /state' : ''})`
    )
  )

  console.log('[lily] activated — Mark Inflections, Dedupe, Reconstruct, Show in Lily registered')
}
