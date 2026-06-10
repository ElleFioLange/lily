# watcher-spike

Standalone feasibility test for a polling **"watcher bridge"** between Ableton Live
(via the official Extensions SDK) and Lily. It is intentionally **not** wired into Lily.

See [`../../docs/ABLETON_EXTENSION.md`](../../docs/ABLETON_EXTENSION.md) for the full
write-up. Result: ✅ background-timer reads + diffing + a localhost server all work.

## What it does

In `activate` it:

1. Polls `song / tracks / devices / clipSlots` every second from a background timer
   (the key test — reads from **outside** a command callback).
2. Diffs each snapshot and logs only on change.
3. Serves the latest snapshot as JSON at `http://127.0.0.1:7878` (the Lily-facing half).
4. Registers a right-click **"Watcher: Snapshot (command)"** on Audio Tracks as a
   known-good baseline (reads from inside a command always work).

## Setup (one-time)

The SDK + CLI are confidential beta tarballs and are **gitignored** (`vendor/`). Copy them
in from your extracted SDK distribution:

```bash
mkdir -p vendor
cp /path/to/extensions-sdk-1.0.0-beta.0/ableton-extensions-sdk-1.0.0-beta.0.tgz vendor/
cp /path/to/extensions-sdk-1.0.0-beta.0/ableton-extensions-cli-1.0.0-beta.0.tgz vendor/
npm install
```

Create `.env` (also gitignored) pointing at your Live Beta's Extension Host:

```
EXTENSION_HOST_PATH=/Applications/Ableton Live 12 Beta.app/Contents/Helpers/ExtensionHost/ExtensionHostNodeModule.node
```

Requires Node ≥ 24.14.1 for the build step (`nvm use default`). The Extension Host itself
runs under Live's bundled Node.

## Run

1. In Live: Preferences → Extensions → enable **Developer Mode**, and open a Set.
2. Stop any other dev Extension Host first (only one at a time).
3. Launch:
   ```bash
   npm start            # builds + spawns the Extension Host
   curl -s http://127.0.0.1:7878   # latest snapshot JSON
   ```
4. Stop: `pkill -f ExtensionHostNodeModule`
