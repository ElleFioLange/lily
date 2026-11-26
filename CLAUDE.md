# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lily is an Electron application for live visual performance: a **Hydra-only video mixer**. You
run any number of Hydra layers, mix them (alpha, blend mode, order, presets, crossfades) into a
projector output, and rehearse a separate mix in preview. Built with React, TypeScript, and Vite
using the electron-vite build system.

The old plugin system (dynamic plugin discovery, Ableton, Strudel, Operator, Syphon, LLM Poiesis,
OSC, Claude API, phone camera streaming) was removed in the `hydra-mixer` branch; see git history
on `main` for it.

### Core Architecture

1. **Sources** - The two kinds of layer the mixer holds, registered statically in
   `src/renderer/src/sources/index.ts` (no dynamic loading)
2. **Compositor** - Alpha-blends multiple canvas sources into performance output
3. **Performance Window** - React Portal child window for projector output
4. **Preview** - A second mix you can rehearse and crossfade to live

### Sources (`src/renderer/src/sources/`)

- **hydra** (`sources/hydra/`) - Hydra graphics synthesis, one canvas per layer; any number of
  instances. Patches are evaluated into a synth via
  `evalPatch` (`process.ts`) inside a `with (synth)` block so live properties like `time` stay
  live. The focused layer's o0–o3 monitor is always on. It is a synced monitor: a second `autoLoop: false` Hydra instance
  (owned by `ui/Monitor.tsx`) that renders the same patch with `render()` appended (4-up split of
  o0–o3), driven by a rAF loop that copies the main signal's `time` each frame. The monitor is
  never added to the compositor; instead the Monitors panel shows four tiles, each
  drawn from one quadrant of the monitor canvas (column-major: o0 TL, o1 BL, o2 TR, o3 BR). Monitor
  state (`monitorHydra`, `monitorCanvas`) lives in `store.ts`.
  The shader text shown in the performance window is laid out by `performanceText`
  (`{ fontSize, x, y }` — px, and % of window for the top-left offset; `setPerformanceText`
  merges partial updates, `DEFAULT_PERFORMANCE_TEXT` resets). `ui/Options.tsx` exposes sliders;
  `ui/Workspace.tsx` applies them only when `environment === 'performance'` (font size via a
  CodeMirror `Compartment`, position via absolute `left`/`top`). The main editor stays at 14px.
  Scroll sync: the main editor writes `scrollPos` (doc position of its first visible character,
  read from CodeMirror's `scrollDOM` and mapped through edits); performance/preview editors
  `scrollIntoView(scrollPos, { y: 'start' })` so the same text stays at the top despite
  different font size and wrapping. Line numbers are hidden in performance/preview.
  Speed: `speed`/`setSpeed` in the store sets `hydra.synth.speed` (hydra-synth advances `time`
  by `dt * speed`, so frame rate is unchanged). `process.ts` re-applies it after each eval, so the
  Options slider (0–2×) overrides any `speed = ...` in a patch.
- **poiesis** (`sources/poiesis/`, optional) - The poetic text layer: typed text whose
  config keywords (YAML) trigger audio-reactive shader effects on the text. Includes its config
  editor, `AudioManager` (multichannel capture via audify in the main process), and the Mallet MIDI
  keyboard (`mallet/`, mounted through `Background`). It is on by default; set
  `VITE_LILY_POIESIS=false` to build/run without it (`sources/flags.ts`). When off, it is never
  imported, and Settings shows nothing. Its config schema still accepts the old `ableton:` keys so
  existing configs parse, but nothing acts on them. To drop it for good, delete `sources/poiesis/`,
  `sources/flags.ts`'s flag and the Poiesis block in `sources/index.ts`, plus the audio and
  config IPC in main/preload.

### Electron Process Architecture

1. **Main Process** (`src/main/index.ts`) - App lifecycle, menus, file dialogs, settings, audio capture, IPC handlers
2. **Preload Script** (`src/preload/index.ts`) - Exposes APIs to renderer via `contextBridge`
3. **Renderer Process** (`src/renderer/`) - React UI with Zustand state management

## Development Commands

**Package Manager**: Use `pnpm` for all package management operations.

- `pnpm dev` - Start development server with HMR
- `pnpm start` - Preview built application
- `pnpm typecheck` - Type check all code
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier
- `pnpm build` - Type check and build for development
- `pnpm build:mac` / `build:win` / `build:linux` - Build platform distributables
  - `build:mac` packages the Electron already installed in `node_modules/electron/dist`
    (`-c.electronDist`) instead of downloading from GitHub, which is unreachable on the dev
    network. This only produces builds for the host arch (arm64).

## Source Definitions (`src/renderer/src/sources/types.ts`)

```typescript
type SourceDefinition<StoreType> = {
  manifest: {
    id: string
    name: string
    outputTypes: ('graphics' | 'editor')[]
    allowMultiple: boolean
  }
  init: (instanceId: string) => UseStore<StoreType> // create store, register canvas/editor with the compositor
  process: (instanceId: string) => void | Promise<void> // called for every active source on Run
  cleanup: (instanceId: string) => void
  createStore: (instanceId: string) => UseStore<StoreType>
  // UI Components (all optional)
  Workspace?: FunctionComponent<WorkspaceProps>
  Options?: FunctionComponent<UIProps>
  Monitor?: FunctionComponent<UIProps>
  Renderer?: FunctionComponent<RendererProps>
  Background?: FunctionComponent // mounted once at app level while registered
}
```

Lifecycle: `loadSources()` returns the definitions, `App.tsx` registers them with
`useSourcesStore.registerSource()`, the `+` button calls `loadSource(id)` which creates an
instance with a UUID `instanceId` and calls `init`, Run (Cmd/Ctrl+Shift+Enter) calls `process` on
every active instance, and closing a layer calls `cleanup` and removes its compositor source.

Graphics sources register their canvas in `init`:

```typescript
const { addGraphicsSource, addEditorSource } = useGraphicsStore.getState()
addGraphicsSource({ id: instanceId, canvas }) // WebGL canvas with preserveDrawingBuffer: true
addEditorSource({ id: instanceId }) // if the source has a text overlay
```

## Graphics System

### Graphics Store (`src/renderer/src/stores/useGraphicsStore.ts`)

Manages compositor sources and mixer parameters:

```typescript
type MixerParams = {
  alpha: number      // 0-1 opacity
  zIndex: number     // Layer order (lower = behind)
  blendMode: BlendMode
  enabled: boolean
}

interface GraphicsState {
  graphics: Record<string, MixerParams>  // Canvas sources
  editors: Record<string, MixerParams>   // Editor overlays
  graphicsOrder: string[]                // Mixer order (index = zIndex)
  editorsOrder: string[]
  compositorRef: Compositor | null

  addGraphicsSource: ({ id, canvas, initParams? }) => void
  addEditorSource: ({ id, initParams? }) => void
  updateParams: (id, type, updates) => void
  reorderSource: (type, fromIndex, toIndex) => void
  setOrder: (type, ids) => void          // Replace an order wholesale, re-applying zIndex
  removeSource: (id) => void
  addOutput: ({ id, canvas, window }) => void
  startRenderLoop: (outputId) => void
  stopRenderLoop: (outputId) => void
}
```

### Compositor (`src/renderer/src/graphics/Compositor.ts`)

Blends multiple canvas sources into output canvases:

```typescript
class Compositor {
  addSource(source: CompositorSource): void
  removeSource(id: string): void
  updateSource(id: string, updates: Partial<CompositorSource>): void
  addOutput({ id, canvas, window }): void
  removeOutput(id: string): void
  startRenderLoop(outputId: string): void
  stopRenderLoop(outputId: string): void
}
```

## Performance Window

The Performance Window (`src/renderer/src/windows/performance/PerformanceWindow.tsx`) renders to a child window via React Portal:

- Opens via Window menu or Cmd/Ctrl+Shift+P
- Cmd/Ctrl+Shift+F toggles it full screen (main process tracks the child `BrowserWindow` as
  `performanceWindowRef` via `did-create-window` and calls `setFullScreen`)
- Renders compositor canvas (graphics sources)
- Overlays editor sources with CSS `mixBlendMode` via `components/EditorOverlays.tsx` (iterates
  `editorsOrder`; shared with the preview stage)
- Shares Zustand stores with main window (same renderer process)

## Full Performance Preview

**Cmd+Shift+O** (Window menu → `performance:full-preview` IPC → `usePerformanceStore.toggleFullPreview`)
covers the whole control center with the live mix as the performance window shows it
(`components/FullPreview.tsx`, a `Stage` on output `program-full`). The panels stay mounted
underneath so every layer keeps running. Esc or the hover button exits. This is separate from
Preview Mode below, which edits a second mix.

## Preview Mode

App-level preview of the performance window with its own mix, toggled by the **preview** button on
the right of the Mixer header or **Cmd+Alt+P** (Window menu → `preview:toggle` IPC →
`window.api.actions.onTogglePreview` → `usePreviewStore.toggle()` in `App.tsx`).

- **Store** (`stores/usePreviewStore.ts`) - Global store with its own `Compositor` instance and a
  preview mix (`graphics`, `editors`, `graphicsOrder`, `editorsOrder`, `updateParams`,
  `reorderSource`) whose names mirror `useGraphicsStore`. `setupPreviewSync()` (called in `App.tsx`)
  subscribes to the graphics store and mirrors source add/remove; new sources inherit their live
  params and canvases come from `compositorRef.getSource(id).canvas`. `copyFromLive()` re-syncs
  the preview (via `applyMix()`); `sendToLive()` crossfades the live mix to the preview mix. The
  preview mix is kept across toggles.
- **Stage** (`components/PreviewStage.tsx`) - Replaces the Workspace body while active. Lays out
  at the performance window's size (1920×1080 when closed), CSS-scaled to fit; composites into a
  canvas at displayed resolution and overlays editors with `environment="preview"`.
- **Mixer** (`components/Mixer.tsx`) - `MixerSections` renders one group per layer from any
  store shaped like `GraphicsState`; the Mixer feeds it the live store or the preview store.
  A group holds the layer's "visuals" (graphics) and "code" (editor overlay) channels, each with
  alpha, enable and a blend mode select. Dragging a group by its grip moves the layer in both
  `graphicsOrder` and `editorsOrder`. Editor-only layers (Poiesis) are listed last and don't move. Blend modes
  (`graphics/blendModes.ts`, `BLEND_MODES`) are stored as canvas `globalCompositeOperation` names;
  `cssBlendMode()` maps them to CSS `mix-blend-mode` for editor overlays (`source-over`→`normal`,
  `lighter`→`plus-lighter`).
- **Presets** (`stores/useMixerPresetsStore.ts`) - Session-only list shared by both mixers.
  Presets are `MixSnapshot`s (`graphics`, `editors`, orders) keyed by instance id; `+ save` adds
  the current mixer's mix, Shift+click overwrites, × deletes. The live mixer recalls with
  `fadeLiveTo()` (alpha crossfade over `fadeSeconds`, ticked on the performance window's rAF when
  open; blend/order/newly-enabled switch at the start, disabled layers switch off at the end).
  Manual live mixer edits call `cancelFade()`. The preview mixer recalls instantly via
  `usePreviewStore.applyMix()` and never touches live; `sendToLive()` uses `fadeLiveTo()` too.
  `snapshotMix` and `mergeOrder` live here and are reused by the preview store.
- **`environment: 'preview'`** - Workspaces rendered in the preview must be side-effect free.
  Poiesis renders `TextOverlay` without keyword shaders (they're keyed by keyword on the shared
  shader manager) and skips audio/shader init; Hydra applies `performanceText` as in performance.

## UI Layout

### Layout Structure (`src/renderer/src/components/Layout.tsx`)

```
┌──────────────────────────────────┬──────────────────┐
│  Workspace (tabs, +, files, run, │  Mixer           │
│  Poiesis tab)                    │  - presets       │
│  - focused layer's Workspace     │  - one group per │
│  - focused layer's Renderer      │    layer         │
│  - file browser overlay (Cmd+O)  │                  │
├──────────────────────────────────┤                  │
│  Monitors                        ├──────────────────┤
│  focused o0–o3 │ other layers │  │  Options         │
│                     │ program    │  - open, save    │
│                                  │  - speed, text   │
└──────────────────────────────────┴──────────────────┘
```

The right sidebar runs the full height. Monitor tiles size themselves (`--tile-h`) so every tile
fits the panel.

### Main Components

- **Workspace.tsx** - Focused layer's Workspace + Renderer; layer tabs (double-click to rename) and
  `+` to add a Hydra layer. Only this header shows layer tabs.
- **Mixer.tsx** - Alpha/enabled/blend controls for editors and graphics, presets, preview toggle
- **Monitors.tsx** - Focused layer's Monitor (Hydra: o0–o3), thumbnails of the other Hydra layers
  (click to focus), and `ProgramMonitor` (the live compositor through `Stage`, as the performance
  window shows it)
- **Options.tsx** - Focused layer's Options (Hydra: Open/Save/Save as, speed, performance text)
- **Stage.tsx** - Scaled replica of the performance window for a compositor + editor overlays;
  used by `PreviewStage` and `ProgramMonitor`
- **FileSystem.tsx** - File browser overlaid on the focused Hydra patch with a transparent
  background (`useBrowserStore.open`; toggled by the header's **files** button or **Cmd+O**). Lists
  every `.js` file in the working directory (`useWorkingDirectoryStore`; main-process `workdir:*`
  IPC, saved in settings as `workingDirectory`). Skips hidden folders and `node_modules`; refreshes
  on window focus. Picking a file opens it in the focused layer (`utils/actions/openPatch.ts`) and
  hides the browser.

### Layers

Every layer you add is Hydra (`addLayer`). Pinned sources (`manifest.pinned`, i.e. Poiesis) get one
instance per session, created by `startSession` at startup along with "Layer 1", and can't be
closed or renamed. Their tab sits on its own in the editor header's right corner, and **Cmd+P**
(`togglePoiesis`) switches to Poiesis and back to the last Hydra layer (`lastLayer`). Each
`ActiveSource` has a `name` ("Layer N", counting up from the highest open one; renamable with
`renameLayer`). The header's run button evaluates only the focused layer (`runFocused`).

### Sessions (`.lly`, `src/renderer/src/stores/useSessionStore.ts`)

File menu: Toggle File Browser (Cmd+O), Open Session (Cmd+Alt+O), Save Session (Cmd+S), Save Session As (Cmd+Shift+S). A `.lly` file
is JSON (`format: "lily-session"`, `version: 1`) holding the working directory, every layer (source,
name, and the source's own `serialize` data, e.g. Hydra's patch text as it stands, path, speed,
performance text), the mixer and presets keyed by file-local layer ids (`layer-1`...), and the fade
time. Opening one closes all unpinned layers, rebuilds them, reuses the pinned Poiesis layer,
remaps the mixer onto the new instance ids and runs every patch. Sources opt in with
`serialize`/`restore` on their definition; `restore` must ignore malformed data.

### Sources Store (`src/renderer/src/stores/useSourcesStore.ts`)

```typescript
interface SourcesState {
  registered: Record<string, SourceDefinition> // Available sources
  active: Record<string, ActiveSource> // Running instances (layers)
  focused: string | null // Currently focused instanceId
  lastLayer: string | null // most recently focused Hydra layer

  registerSource: (source) => void
  loadSource: (sourceId) => string | null // returns the new instanceId
  addLayer: () => string | null // a new Hydra layer
  startSession: () => void // pinned sources + Layer 1, once
  unloadSource: (instanceId) => void // no-op for pinned layers
  renameLayer: (instanceId, name) => void
  getInstance: (instanceId) => ActiveSource
  setFocused: (focused) => void
  togglePoiesis: () => void // Cmd+P
}
```

## Styling

- **Tailwind CSS v4** with stone color palette
- Background: `bg-stone-950` (body), `bg-stone-800` (dividers), `bg-stone-700` (panels)
- Text: `text-stone-100`
- Hover: `hover:bg-stone-600`, `hover:bg-stone-800`

## Path Aliases

- `@renderer` → `src/renderer/src/`

## TypeScript Configuration

- `tsconfig.node.json` - Main and preload (Node.js)
- `tsconfig.web.json` - Renderer (DOM)
- `tsconfig.json` - Root config

## Important Notes

- Each source instance gets its own Zustand store via `createStore(instanceId)`
- `instanceId` is a UUID generated when adding a layer
- Multiple Hydra layers can run simultaneously
- Graphics sources must use `preserveDrawingBuffer: true` for WebGL
- Editor sources render as overlays in the performance window
- The compositor uses the target window's `requestAnimationFrame` for timing
