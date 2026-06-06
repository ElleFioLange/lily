# Ableton Extensions SDK — Integration Notes

Working notes for integrating Lily with the official **Ableton Extensions SDK**
(`@ableton-extensions/sdk`, `1.0.0-beta.0`). This documents what the SDK can/can't
do and how it could replace or augment Lily's current Max-for-Live + OSC pipeline.

> Status: planning / research. Nothing here is wired into the app yet. The current
> Live integration still goes through `src/plugins/ableton/maxdevice/lily-controller.amxd`
> + OSC (see `docs/OSC.md`).

## TL;DR

- An extension is a **Node.js process Live launches alongside it** ("Extension Host").
  Full npm ecosystem, full `fs`, full network access.
- It is **command- and pull-based**: you read/modify the Live Set when a command fires.
  There are **no change events / observers** — you cannot live-mirror Live state.
- It **cannot** do automation, MIDI mapping/learn, or transport (play/stop/record). It
  **can** set a device parameter value one-shot, create/delete/edit tracks·clips·devices,
  render audio from the arrangement, and import files into the project.
- Best fit for Lily: **on-command content generation + rendering** (e.g. "Generate with
  Suno → import clip"), plus a **snapshot project tree** to power the Ableton Explorer UI.

## Prerequisites & dev loop

- **Ableton Live Beta** (from Centercode) — the SDK only runs against the Beta build.
- **Node.js ≥ 24.14.1**.
- Enable **Developer Mode**: Live → Preferences → Extensions. This lets you own the
  Extension Host so `npm start` rebuilds + hot-reloads the extension without restarting Live.
- Scaffold a new extension:
  ```bash
  mkdir lily-ext && cd lily-ext
  npx file:/path/to/extensions-sdk-1.0.0-beta.0/ableton-create-extension-1.0.0-beta.0.tgz
  npm start   # builds + launches the Extension Host (reads EXTENSION_HOST_PATH from .env)
  ```
- Logs (incl. `console.*` and uncaught stack traces): `ExtensionHost.txt`
  - macOS: `~/Library/Preferences/Ableton/Live x.x.x/ExtensionHost.txt`

## Extension shape

```ts
import { initialize, type ActivationContext } from "@ableton-extensions/sdk"

export function activate(activation: ActivationContext) {
  const context = initialize(activation, "1.0.0")

  context.commands.registerCommand("lily.doThing", (arg: unknown) => { /* ... */ })

  context.ui.registerContextMenuAction(
    "AudioTrack.ArrangementSelection", // scope
    "Lily: Do Thing",                  // menu label
    "lily.doThing",                    // commandId
  )
}
```

`manifest.json`: `{ name, author, entry: "dist/extension.js", version, minimumApiVersion: "1.0.0" }`.

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
- `await song.createCuePoint(time)` — `time` is a **number (beats) only**. There is no
  name parameter and no string overload at either layer. Name it in a second step:
  ```ts
  const cp = await song.createCuePoint(8) // at beat 8
  cp.name = "Drop"                        // name is the only writable field
  ```
- `await song.deleteCuePoint(cp)`.
- `time` has no setter — to **move** a locator, delete + recreate (+ rename) at the new beat.

### Tracks (`Track` / `AudioTrack` / `MidiTrack`)
- Read/write: `name`, `mute`, `solo`, `arm` (read: `mutedViaSolo`, `groupTrack`)
- Children: `clipSlots`, `takeLanes`, `arrangementClips`, `devices`, `mixerDevice`
- Edit: `createMidiClip(start,dur)`, `createAudioClip({filePath,...})`,
  `insertDevice(name, index)`, `deleteDevice()`, `duplicateDevice()`,
  `deleteClip()`, `clearClipsInRange(start,end)`, `createTakeLane()`

### Clips
- `Clip`: `name` (get/**set**), `color` (get/**set** — packed RGB int, e.g. `0xFF0000`),
  `muted` (get/**set**), `looping` (get/**set**), `startTime`, `endTime`, `duration`,
  `startMarker`, `endMarker`, `loopStart`, `loopEnd`
- `AudioClip`: `filePath`, `warping`, `warpMode` (get/**set**), `warpMarkers`
- `MidiClip`: `notes` (get/**set** — full note-list read/write)
- `ClipSlot`: `clip`, `createMidiClip(length)`, `createAudioClip({filePath,...})`, `deleteClip()`

### Scenes (`Scene`) — Session view rows
- `song.scenes` → `Scene[]` (sync read). Each: `name` (get / **set**), `tempo`,
  `signatureNumerator`, `signatureDenominator` (all read-only).
- `await song.createScene(index)`, `await song.deleteScene(scene)`,
  `await song.duplicateScene(scene)`.
- **Scene/track slots are parallel-indexed:** `track.clipSlots[i]` is the slot in
  scene `i`. There's no `Scene.clipSlots` — iterate tracks at index `i` to read/build a row.
- You **can rename scenes** (great for labeling Session rows by section), but **cannot**
  set a scene's tempo/time-signature, and **cannot launch** a scene (no transport).
- Pairs with the two ideas: after `Dedupe to Session`, name the filled scenes after the
  `Mark Inflections` sections to reconstruct a labeled Session-view map of the arrangement.

### Devices & parameters
- `Device`: `name`, `parameters`
- `DeviceParameter`: `name`, `internalMin`, `internalMax`, `defaultValue`, `isQuantized`,
  `valueItems`, `getInternalValue()`, **`setInternalValue(value)`** (one-shot set — *not*
  automation, *not* mapping)
- Mixer: `mixerDevice.volume`, `.panning`, `.sends` (each is a `DeviceParameter`)
- Racks: `RackDevice.chains`, `insertChain()`; `DrumRack`, `DrumChain.receivingNote`;
  `Simpler.sample` / `replaceSample(filePath)`

### `resources` — audio & files  ⭐ key for generation workflows
- `renderPreFxAudio(track, startBeat, endBeat) → Promise<string>` — renders a WAV (pre-FX)
  of a track over a beat range to the extension's temp dir.
- `importIntoProject(filePath) → Promise<string>` — copies a file into the Live project
  folder; **use the returned path** in subsequent calls.

### `ui`
- `registerContextMenuAction(scope, title, commandId) → unregister fn`. Scopes:
  `AudioClip`, `AudioTrack`, `ClipSlot`, `DrumRack`, `MidiClip`, `MidiTrack`, `Sample`,
  `Scene`, `Simpler`, `ClipSlotSelection`, `AudioTrack.ArrangementSelection`,
  `MidiTrack.ArrangementSelection`. The command receives the triggered object's `Handle`
  (or a selection) as its first arg.
- `showModalDialog(url, w, h) → Promise<string>` — webview from `file:`/`data:`/`https:`/
  `http://localhost`. The page returns a result by posting
  `{ method: "close_and_send", params: [resultString] }` to the host.
  **This is how a Lily React UI can render inside Live.**
- `withinProgressDialog(text, {progress}, async (update, abortSignal) => {...})` — progress
  bar + cancellation for long-running ops.

### `environment`
- `storageDirectory` — persistent per-extension dir (good for **API keys / config**)
- `tempDirectory` — scratch (may be cleared between sessions)
- `language` — ISO 639-1, e.g. `"EN"`

### `commands` & transactions
- `commands.registerCommand(id, cb)` / `executeCommand(id, ...args)`
- `context.withinTransaction(fn)` — batch edits into one undoable transaction
- `context.getObjectFromHandle(handle, Type)` — resolve a `Handle` to a typed object
  (pass `DataModelObject` + `instanceof` when the type is unknown)

## Limitations (what to design around)

| Want | Possible? | Notes |
|------|-----------|-------|
| Read tracks/clips/devices/params | ✅ | But snapshot-only (no events) |
| Set a knob/param to a value | ✅ | `setInternalValue` — one-shot, not recorded |
| Create clips/tracks/scenes/devices | ✅ | Batch with `withinTransaction` |
| Locators (create/delete/rename) | ✅ | `CuePoint`; `time` is read-only (can't move — delete+recreate) |
| Scenes (create/delete/duplicate/rename) | ✅ | `Scene.name` get/set; tempo & time-sig read-only; **no launch** |
| Render stems / import audio | ✅ | `renderPreFxAudio` + `importIntoProject` |
| Call external APIs (Suno, etc.) | ✅ | Full Node `fetch`/npm |
| **Fire / launch a clip or scene** | ❌ | No `ClipSlot.fire()` / `Scene.fire()` — data only |
| **Transport play/stop/record** | ❌ | No transport at all; no playhead, no `isPlaying` |
| Write/record automation envelopes | ❌ | Not in the API |
| MIDI map / "learn" a control | ❌ | Not in the API |
| Subscribe to "Live changed" events | ❌ | Pull-based; re-read on command/poll |
| Live-mirror project state for a UI | ⚠️ | Only via polling / refresh-on-command |

**Implication for Lily:** the SDK is **not a control surface** — it cannot launch clips, control transport, write automation, or map controls. It is a **data-model, offline-render, and UI-command** API. It shines for generation and project-manipulation commands, not live triggering.

### Division of labor: Extensions SDK vs. Max for Live / OSC

Because the SDK has no clip-launch or transport, the *live performance* path must stay on a
different channel. Keep the two concerns split:

- **Extensions SDK** → the **offline / generative / structural** side: watcher snapshot
  (tracks, devices, clips, locators), Suno-style "generate → import clip," batch edits,
  stem rendering, renaming/organizing.
- **Max for Live + OSC** (`src/plugins/ableton/maxdevice/lily-controller.amxd`) → the
  **live** side: firing clips/scenes, transport, real-time triggering. The classic Live
  Object Model (`clip_slot.fire()`, transport) is reachable from M4L / Remote Scripts but
  **not** from the Extensions SDK.

## How it maps to Lily

### Ableton Explorer (Figma: Tracks → Devices → Parameters columns)
Direct read of `song.tracks → track.devices → device.parameters`. Because there are no
change events, treat it as a **snapshot refreshed on demand** (a Refresh action, or re-read
each time a command runs) rather than a live mirror.

### "Generate with Suno" (the strong hackathon path)
Mirrors the bundled `strip-silence` example almost 1:1:

```
right-click clip / arrangement selection
  → registerContextMenuAction → command
  → ui.withinProgressDialog(...)
      → (optional) resources.renderPreFxAudio(selection) as a conditioning input
      → fetch Suno API (key from environment.storageDirectory)
      → download generated WAV to tempDirectory
      → resources.importIntoProject(wavPath)
      → track.createAudioClip({ filePath }) / clipSlot.createAudioClip(...)
```

No automation/knobs/mapping involved — it sidesteps every limitation above.

## Watcher bridge (polling) — ✅ VALIDATED

The SDK has no change events, so a live-updating view (e.g. the Ableton Explorer)
must **poll + diff**. The open question was whether the data model can be read from a
**free-running background timer** (outside a command callback). A standalone spike
(`extensions/watcher-spike/`) confirmed it works.

**What the spike proved (against Live 12 Beta, a real 8-track Set):**
- ✅ A `setInterval` in `activate` reads `song` / `tracks` / `devices` / `clipSlots`
  every 1s, **outside any command** — no errors, ticks steady at 1s.
- ✅ Structural reads (`name`, `mute`, `solo`, `arm`, device names, clip names) are
  **synchronous and cheap**.
- ✅ Snapshot **diffing** (serialize + compare) emits only on change.
- ✅ The extension can **host a localhost HTTP server** (`127.0.0.1:7878`) that an
  external process consumes — verified with `curl` (this is the Lily-facing half,
  proven without touching Lily).
- The host runs under Ableton's **bundled Node 24.14.1** (`…/ExtensionHost/node`), so
  the local toolchain Node only matters for the build step.

**Still true (design around these):**
- Device parameter **values** are async (`getInternalValue` is callback-based) — keep
  them out of the structural poll; read them on-demand for the focused track/device.
- Polling is a snapshot — transient changes between ticks are missed; no transport /
  automation / playhead.

**Recommended shape:** two-tier polling — a ~1–2s structural poll (sync props, full
diff) plus an on-demand focused value poll for whatever the Explorer has selected —
pushed to Lily over WS/HTTP. See the spike for a working reference.

## Integration architectures (extension ↔ Lily)

1. **Bridge (extension hosts a localhost server).** The extension runs an HTTP/WS server
   in Node; Lily connects to read the project tree (powers the Explorer) and to issue
   generate/render commands. Could replace the Max-for-Live + OSC **read** path.

2. **Embed (Lily UI inside Live).** `ui.showModalDialog("http://localhost:<lily-port>/...")`
   loads Lily's React UI inside Live's modal; the page posts results back. Good for the Suno
   generate panel specifically.

3. **Augment (keep OSC, add extension).** Leave today's Max/OSC keyword pipeline alone and
   add the extension only for generation/rendering. Lowest-risk for a hackathon demo.

## Open questions / next steps

- Decide bridge vs. embed vs. augment (default: **augment** for the first demo).
- Where the extension lives — likely `extensions/lily-ext/` in this repo (its own
  `package.json`, builds to `dist/extension.js`).
- Confirm Suno API contract (endpoint, async job polling, conditioning inputs).
- Define the Lily↔extension message schema if going the bridge route.

## References (in the SDK distribution)

- `docs/` — rendered guide (Getting Started, Essentials, Design, Development)
- `examples/strip-silence` — render + arrangement selection + progress dialog (closest template)
- `examples/{context-menu,modal-dialog,progress-dialog,audio-clips,warpMode,arrangementselection}`
- `ableton-extensions-sdk-1.0.0-beta.0.tgz` → `dist/index.d.mts` (full typed API surface)
