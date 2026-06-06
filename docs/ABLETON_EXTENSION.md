# Ableton Extensions SDK — Integration Notes

How Lily integrates with the official **Ableton Extensions SDK**
(`@ableton-extensions/sdk`, `1.0.0-beta.0`): what the SDK can/can't do, what Lily
actually ships on it, and what was prototyped and parked.

> Status: **in use.** The extension lives at `extensions/lily/` (tools + bridge,
> see below). The *live performance* path (firing clips, transport) still goes
> through `src/plugins/ableton/maxdevice/lily-controller.amxd` + OSC (`docs/OSC.md`)
> — the SDK cannot do that part by design.

## TL;DR

- An extension is a **Node.js process Live launches alongside it** ("Extension Host").
  Full npm ecosystem, full `fs`, full network access.
- It is **command- and pull-based**: you read/modify the Live Set when a command fires.
  There are **no change events / observers** — you cannot live-mirror Live state.
- It **cannot** do automation, MIDI mapping/learn, transport, or clip/scene launch. It
  **can** read the whole data model, set a device parameter one-shot, create/delete/edit
  tracks·clips·devices, render audio from the arrangement, and import files.
- Lily uses it for: **on-command arrangement tools** (right-click), and a **localhost
  bridge** that hands the Lily app a path-annotated snapshot of the Set plus
  "Show in Lily" selection pushes.

## What's in use today (`extensions/lily/`)

### Right-click tools (context menu on tracks; Show in Lily also on clips)

- **Lily: Mark Inflections** — drops `✦` locators at structural section boundaries.
- **Lily: Dedupe to Session** — unique arrangement clips → Session grid, non-destructive.
- **Lily: Reconstruct to Session** — arrangement → labeled, energy-colored Session grid.
- **Lily: Show in Lily** — pushes the clicked track/clip's identity to the Lily app
  (see *Selection push* below).

Details + setup: [`extensions/lily/README.md`](../extensions/lily/README.md).

### The bridge — Lily's read path

The extension runs an **always-on localhost HTTP server** on `127.0.0.1:7879`:

| Route | What |
|---|---|
| `GET /snapshot` | Full project tree, re-serialized per request — this is the Lily UI's **Refresh**. |
| `GET /selection` | Last *Show in Lily* payload (`{ selection: null }` until first use). |
| `/mark` `/dedupe` `/reconstruct` `/state` | Dev-only command triggers, opt-in via `LILY_DEV_HARNESS=1`. |

**Every node in `/snapshot` carries its canonical Max/LOM path** (`maxPath`). The SDK
exposes objects but not their LiveAPI paths, so `snapshot.ts` reconstructs them from
array indices while walking the tree — these are exactly the paths
`lily-controller.amxd` resolves via `new LiveAPI(path)` and `process.ts` emits over OSC:

| SDK | LOM path component |
|---|---|
| `song.tracks[i]` | `live_set tracks i` |
| `song.returnTracks[i]` | `live_set return_tracks i` |
| `song.mainTrack` | `live_set master_track` |
| `track.clipSlots[j]` (+ `.clip`) | `… clip_slots j` (+ ` clip`) |
| `track.devices[k]` | `… devices k` |
| `device.parameters[p]` | `… parameters p` |
| `track.mixer` (volume/panning/sends) | `… mixer_device volume` / `panning` / `sends i` |

Returns/master emit `clipSlots: []` (addressing `master_track clip_slots N` is invalid).
Verified against a real 18-track Set: 2573 path checks, 43 clips kind-tagged midi/audio.

### Selection push — "Show in Lily"

The context action resolves the clicked object by `handle.id`, derives its `maxPath`
(same grammar as the snapshot), and delivers a JSON payload two ways:

1. **OSC push** to Lily's existing server (`127.0.0.1:5460`), address `/lily/select`,
   one JSON string arg — Lily side: `window.api.osc.on('/lily/select', …)`.
2. **`GET /selection`** on the bridge (for when Lily launches after the click).

```json
{
  "type": "clip",
  "name": "Verse",
  "maxPath": "live_set tracks 0 clip_slots 2 clip",
  "trackName": "Bass",
  "trackPath": "live_set tracks 0",
  "clipKind": "midi"
}
```

Arrangement clips have no session-slot path → `maxPath` falls back to the track,
flagged `inArrangement: true`. The monitor pane highlights by matching `maxPath`
against its snapshot tree. OSC encoding is a minimal in-repo string encoder
(`osc.ts`, no deps), verified against the `osc` package Lily's server uses.

### SDK gotchas hit in practice

- **`bigint` numerics.** Several numeric getters (clip `color`/times, param
  `min`/`max`/`defaultValue`, `tempo`, scene signature, cue `time`) return `bigint` at
  runtime despite `.d.ts` saying `number` — `JSON.stringify` throws on them.
  `snapshot.ts` coerces via `Number()`; the bridge adds a bigint-safe replacer.
- **Param *values* are async** (`getValue()` is a Promise) — kept out of the structural
  snapshot; read on demand for a focused selection only.
- **One dev host at a time / stale handshake.** A repeating
  `Failed to process receive queue, closing connection` loop on startup means Live's
  extension socket is stale (usually after the host was killed/restarted). Fix: quit
  your `npm start`, toggle **Preferences → Extensions → Developer Mode** off/on (or
  restart Live), then `npm start` again and wait for `[lily] activated`.
- **`Track.mixer`**, not `mixerDevice` — the SDK property names differ from LOM
  components in several places (see the mapping table above).

## Prerequisites & dev loop

- **Ableton Live Beta** (from Centercode) — the SDK only runs against the Beta build.
- **Node.js ≥ 24.14.1** (repo `.nvmrc` is 24). The host itself runs Ableton's bundled
  Node; your local Node only matters for the build.
- Enable **Developer Mode**: Live → Preferences → Extensions, then from
  `extensions/lily/`: `npm start` (builds + launches the host; menu items appear on
  right-click). Logs incl. `console.*`:
  `~/Library/Preferences/Ableton/Live x.x.x/ExtensionHost.txt`.

## Extension shape

```ts
import { initialize, type ActivationContext } from "@ableton-extensions/sdk"

export function activate(activation: ActivationContext) {
  const context = initialize(activation, "1.0.0")
  context.commands.registerCommand("lily.doThing", (handleOrArg: unknown) => { /* ... */ })
  context.ui.registerContextMenuAction("AudioTrack", "Lily: Do Thing", "lily.doThing")
}
```

`manifest.json`: `{ name, author, entry: "dist/extension.js", version, minimumApiVersion: "1.0.0" }`.
The command receives the right-clicked object's `Handle` (`{ id: bigint }`); resolve it
with `context.getObjectFromHandle(handle, DataModelObject)` and branch via `instanceof`.

## Capability map (`context.*`)

### `application.song` — the Live Set
- `tempo` (get/**set**), `tracks`, `returnTracks`, `mainTrack`, `scenes`, `cuePoints`
- `gridQuantization`, `gridIsTriplet`, `rootNote`, `scaleName`, `scaleMode`, `scaleIntervals`
- Create/delete/duplicate: `createMidiTrack()`, `createAudioTrack()`, `deleteTrack()`,
  `duplicateTrack()`, `createScene()`, `deleteScene()`, `duplicateScene()`,
  `createCuePoint()`, `deleteCuePoint()`

### Locators (`CuePoint`) — Arrangement timeline markers
- `song.cuePoints` → `CuePoint[]` (sync read). Each: `time` (beats, **read-only**),
  `name` (get / **set**).
- `await song.createCuePoint(time)` — beats only, no name param; name in a second step.
- `time` has no setter — to **move** a locator, delete + recreate (+ rename).

### Tracks (`Track` / `AudioTrack` / `MidiTrack`)
- Read/write: `name`, `mute`, `solo`, `arm` (read: `mutedViaSolo`, `groupTrack`)
- Children: `clipSlots`, `takeLanes`, `arrangementClips`, `devices`, `mixer`
- Edit: `createMidiClip(start,dur)`, `createAudioClip({filePath,...})`,
  `insertDevice(name, index)`, `deleteDevice()`, `duplicateDevice()`,
  `deleteClip()`, `clearClipsInRange(start,end)`, `createTakeLane()`

### Clips
- `Clip`: `name` (get/**set**), `color` (get/**set** — packed RGB int), `muted`,
  `looping`, `startTime`, `endTime`, `duration`, `startMarker`, `endMarker`,
  `loopStart`, `loopEnd`
- `AudioClip`: `filePath`, `warping`, `warpMode` (get/**set**), `warpMarkers`
- `MidiClip`: `notes` (get/**set** — full note-list read/write)
- `ClipSlot`: `clip`, `createMidiClip(length)`, `createAudioClip({filePath,...})`, `deleteClip()`

### Scenes (`Scene`) — Session view rows
- `song.scenes` → `Scene[]`. Each: `name` (get / **set**), `tempo`,
  `signatureNumerator/Denominator` (read-only).
- **Scene/track slots are parallel-indexed:** `track.clipSlots[i]` is the slot in
  scene `i`. There's no `Scene.clipSlots`.
- You **can rename scenes**, but **cannot** set scene tempo/time-signature and
  **cannot launch** a scene (no transport).

### Devices & parameters
- `Device`: `name`, `parameters`
- `DeviceParameter`: `name`, `min`, `max`, `defaultValue`, `isQuantized`, `valueItems`,
  `getValue()` (async), **`setValue(value)`** (one-shot set — *not* automation, *not* mapping)
- Mixer: `track.mixer.volume`, `.panning`, `.sends` (each a `DeviceParameter`)
- Racks: `RackDevice.chains`, `insertChain()`; `DrumRack`, `DrumChain.receivingNote`;
  `Simpler.sample` / `replaceSample(filePath)`

### `resources` — audio & files
- `renderPreFxAudio(track, startBeat, endBeat) → Promise<string>` — renders a WAV (pre-FX)
  of a track over a beat range to the extension's temp dir.
- `importIntoProject(filePath) → Promise<string>` — copies a file into the Live project
  folder; **use the returned path** in subsequent calls.

### `ui`
- `registerContextMenuAction(scope, title, commandId)`. Scopes:
  `AudioClip`, `AudioTrack`, `ClipSlot`, `DrumRack`, `MidiClip`, `MidiTrack`, `Sample`,
  `Scene`, `Simpler`, `ClipSlotSelection`, `AudioTrack.ArrangementSelection`,
  `MidiTrack.ArrangementSelection`.
- `showModalDialog(url, w, h) → Promise<string>` — webview from `file:`/`data:`/`https:`/
  `http://localhost`; page returns a result via `close_and_send`.
- `withinProgressDialog(text, {progress}, async (update, abortSignal) => {...})` — progress
  bar + cancellation. **Always `.catch`** — an unhandled rejection crashes the host.

### `environment`
- `storageDirectory` (persistent per-extension dir — API keys/config),
  `tempDirectory` (scratch), `language`.

### `commands` & transactions
- `commands.registerCommand(id, cb)` / `executeCommand(id, ...args)`
- `context.withinTransaction(fn)` — batch edits into one undoable transaction
- `context.getObjectFromHandle(handle, Type)` — resolve a `Handle` to a typed object

## Limitations (what to design around)

| Want | Possible? | Notes |
|------|-----------|-------|
| Read tracks/clips/devices/params | ✅ | Snapshot-only (no events) |
| Set a knob/param to a value | ✅ | `setValue` — one-shot, not recorded |
| Create clips/tracks/scenes/devices | ✅ | Batch with `withinTransaction` |
| Locators (create/delete/rename) | ✅ | `time` read-only (move = delete+recreate) |
| Scenes (create/delete/duplicate/rename) | ✅ | tempo & time-sig read-only; **no launch** |
| Render stems / import audio | ✅ | `renderPreFxAudio` + `importIntoProject` |
| Call external APIs | ✅ | Full Node `fetch`/npm |
| **Fire / launch a clip or scene** | ❌ | No `fire()` anywhere — data only |
| **Transport play/stop/record** | ❌ | No transport, no playhead, no `isPlaying` |
| Write/record automation envelopes | ❌ | Not in the API |
| MIDI map / "learn" a control | ❌ | Not in the API |
| Subscribe to "Live changed" events | ❌ | Pull-based; re-read on command/poll |
| Live-mirror project state for a UI | ⚠️ | Polling / refresh-on-command only |

**Implication:** the SDK is **not a control surface**. It is a data-model,
offline-render, and UI-command API.

### Division of labor: Extensions SDK vs. Max for Live / OSC

- **Extensions SDK** (`extensions/lily/`) → the **offline / structural / read** side:
  snapshot bridge, selection push, arrangement tools, (future) generation/rendering.
- **Max for Live + OSC** (`lily-controller.amxd`) → the **live** side: firing
  clips/scenes, transport, real-time keyword triggering. The classic Live Object Model
  is reachable from M4L but **not** from the Extensions SDK.

The two meet at the **`maxPath`**: the bridge tells Lily *what exists and how to
address it*; Lily's keyword pipeline sends those same paths back over OSC for the M4L
controller to *act on live*.

## Prototyped & parked

- **`extensions/watcher-spike/`** — standalone feasibility test, superseded by the
  built-in bridge. What it proved (still the basis of the design): data-model reads
  work from a **free-running background timer** outside any command; structural reads
  are sync and cheap; snapshot diffing works; an extension can host a localhost server.
  A future live-updating Explorer would poll + diff exactly like this (~1–2s structural
  tick + on-demand value reads); the current bridge is pull-only (`/snapshot` per
  request) because that's all the monitor pane needs today.
- **"Generate with Suno"** (render selection → external API → import clip) — mapped out,
  never built. The capability path (`renderPreFxAudio` → `fetch` → `importIntoProject` →
  `createAudioClip`) remains valid if revived.
- **Embedding Lily UI in Live** via `ui.showModalDialog("http://localhost:…")` — not
  pursued; the bridge + OSC push into the standalone Lily app won out.

## Next steps

- Lily-side monitor pane: highlight on `/lily/select`, Refresh via `GET /snapshot`
  (in progress).
- Arrangement-clip paths (`… arrangement_clips i`) in the snapshot if the monitor
  needs them (currently arrangement clips resolve to their track).
- On-demand parameter *value* reads (focused selection) — likely a bridge route that
  awaits `getValue()` for one device.

## References (in the SDK distribution)

- `docs/` — rendered guide (Getting Started, Essentials, Design, Development)
- `examples/strip-silence` — render + arrangement selection + progress dialog
- `ableton-extensions-sdk-1.0.0-beta.0.tgz` → `dist/index.d.mts` (full typed API surface)
