# lily (Ableton Live extension)

On-command tools for Live, built on the Ableton Extensions SDK. Companion to the Lily
app; see [`../../docs/ABLETON_EXTENSION.md`](../../docs/ABLETON_EXTENSION.md) for the
capabilities/limits these are built on.

It also runs an **always-on localhost bridge** that gives the Lily app a read path
into the Set (see *Bridge* below).

Right-click any track in Live to run the tools (Show in Lily is also on clips):

### Lily: Mark Inflections
Analyzes the **arrangement** and drops locators at structural inflection points.
- **Sections** — where several clips start on the same bar (snapped to the 4-bar grid).
- **Risers/Fills** — short (≤1 bar) clips landing just before a section.
- Assumes **4/4**. Markers are tagged `✦` and the command is **idempotent** (re-running
  clears Lily's previous markers first). Pure structural analysis (sync reads, no render);
  an optional audio-render riser pass is stubbed in `markInflections.ts`.

### Lily: Dedupe to Session
Collects **unique** arrangement clips per track and lays them into **Session view**.
- **Non-destructive** — the arrangement is untouched.
- Fills from the **first empty scene** down (creating scenes if needed), one column per track.
- **Autonamed** `"<track> <n>"`.
- MIDI is reproduced faithfully (notes copied); **audio is best-effort** — trim/warp/loop
  carry across via `loopSettings`, falling back to the untrimmed file if Live rejects it.

### Lily: Reconstruct to Session
Rebuilds the arrangement as a **labeled Session grid**: one scene per inflection
section, each scene named after the section (`✦ Build 3 (7 trk)`) and its row filled
with each track's representative clip for that section (most-overlapping clip).
- Combines the analysis of *Mark Inflections* with the placement of *Dedupe to Session*.
- Appends fresh scenes (non-destructive); **idempotent** — clears its own `✦` scenes first.
- Clips are **colored by section energy** (blue=sparse → red=full) and **autonamed**
  evocatively (`Hushed Ember` → `Blazing Ember`): noun = track identity, adjective =
  section energy. The word pools in `naming.ts` are a placeholder — swap them for Poiesis
  keywords later.
- Launching a reconstructed scene recalls that section's layout.

### Lily: Show in Lily
Pushes the right-clicked **track or clip** to the Lily app so its Ableton monitor
pane can highlight it.
- Sends OSC `/lily/select` to Lily (`127.0.0.1:5460`) with one JSON string arg:
  `{ type, name, maxPath, trackName, trackPath, clipKind?, inArrangement? }`.
- Also exposed at `GET /selection` on the bridge (for when Lily launches later).
- `maxPath` uses the same Max/LOM grammar as `/snapshot`, so highlighting is a
  path-equality match. Arrangement clips fall back to their track's path.

## Bridge

Always-on HTTP server at `http://127.0.0.1:7879` — the Lily app's read path:

```bash
curl -s http://127.0.0.1:7879/snapshot   # full project tree, maxPath on every node
curl -s http://127.0.0.1:7879/selection  # last "Show in Lily" payload
```

`/snapshot` re-serializes the Set on every request — Lily's **Refresh** is just this
fetch. Device-parameter *values* are excluded (async in the SDK); the snapshot is
structural/sync only. See `src/snapshot.ts` for the SDK→LOM path mapping.

## Setup & run

SDK/CLI beta tarballs are gitignored (`vendor/`, confidential). One-time:

```bash
mkdir -p vendor
cp /path/to/extensions-sdk-1.0.0-beta.0/ableton-extensions-sdk-1.0.0-beta.0.tgz vendor/
cp /path/to/extensions-sdk-1.0.0-beta.0/ableton-extensions-cli-1.0.0-beta.0.tgz vendor/
npm install
```

Create `.env` (gitignored) pointing at your Live Beta's Extension Host:

```
EXTENSION_HOST_PATH=/Applications/Ableton Live 12 Beta.app/Contents/Helpers/ExtensionHost/ExtensionHostNodeModule.node
```

Then, with Live in **Developer Mode** (Preferences → Extensions) and a Set open
(only one dev Extension Host at a time):

```bash
nvm use default     # Node >= 24.14.1 for the build
npm start           # builds + launches the host; menu items appear on right-click
# stop:  pkill -f ExtensionHostNodeModule
```

Wait for `[lily] activated` + `[lily] bridge on http://127.0.0.1:7879` in the output.

**Troubleshooting — repeating `Failed to process receive queue, closing connection`:**
Live's extension socket went stale (usually after the host was killed/restarted, or a
second host is running). Quit `npm start`, toggle **Preferences → Extensions →
Developer Mode** off/on (or restart Live), then `npm start` again.

### Dev command triggers (opt-in)

The bridge routes (`/snapshot`, `/selection`) are always on. To additionally trigger
the commands from outside Live (e.g. `curl`) instead of right-clicking, start with
`LILY_DEV_HARNESS=1`. Off by default — production fires commands from the context
menu only.

```bash
LILY_DEV_HARNESS=1 npm start
curl -s http://127.0.0.1:7879/state       # inspect cue points + session clips
curl -s http://127.0.0.1:7879/mark        # run Mark Inflections
curl -s http://127.0.0.1:7879/dedupe      # run Dedupe to Session
curl -s http://127.0.0.1:7879/reconstruct # run Reconstruct to Session
```
