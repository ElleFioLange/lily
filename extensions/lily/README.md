# lily (Ableton Live extension)

On-command tools for Live, built on the Ableton Extensions SDK. Companion to the Lily
app; see [`../../docs/ABLETON_EXTENSION.md`](../../docs/ABLETON_EXTENSION.md) for the
capabilities/limits these are built on.

Right-click any track in Live to run either tool (both analyze/act on the whole Set):

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

### Dev test harness (opt-in)

To trigger the commands from outside Live (e.g. `curl`) instead of right-clicking,
start with `LILY_DEV_HARNESS=1`. It exposes `http://127.0.0.1:7879` with `/mark`,
`/dedupe`, and `/state`. Off by default — production runs from the context menu only.

```bash
LILY_DEV_HARNESS=1 npm start
curl -s http://127.0.0.1:7879/state    # inspect cue points + session clips
curl -s http://127.0.0.1:7879/mark     # run Mark Inflections
curl -s http://127.0.0.1:7879/dedupe   # run Dedupe to Session
```
