# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lily is an Electron application for live visual performance. It features a plugin-based architecture for graphics synthesis (Hydra), text processing (Poiesis), Ableton Live control, and OSC communication. Built with React, TypeScript, and Vite using the electron-vite build system.

### Core Architecture

1. **Plugin System** - Dynamic loading of graphics/audio/editor plugins from `src/plugins/`
2. **Surfaces** - Built-in system plugins (Poiesis, Config) in `src/renderer/src/surfaces/`
3. **Compositor** - Alpha-blends multiple canvas sources into performance output
4. **Performance Window** - React Portal child window for projector output

### Bundled Plugins (`src/plugins/`)

- **hydra** - Hydra graphics synthesis (graphics output)
- **ableton** - Ableton Live control. Today this drives Live via a bundled Max for Live
  device (`maxdevice/lily-controller.amxd`) over OSC; `process.ts` scans Poiesis text for
  `keyword(...)` patterns and emits `/control` messages (`[type, action, path]` for
  clip/track/device, `[type, object, path, value]` for device parameters, plus `send`
  messages for punctuation modifiers) routed by `maxdevice/control.js`. Comma-separated
  args inside `keyword(...)` resolve presets or literals; `_arg` tokens in config paths
  are substituted per-arg. UI components are
  still stubs. See `docs/ABLETON_EXTENSION.md` for the planned migration to the official
  Ableton Extensions SDK.
- **llm-poiesis** - LLM-assisted Poiesis text processing
- **utils** - Shared plugin helpers and types (`PluginDefinition`, `PluginManifest`). Plugins
  import these from `'../utils'`.

### Electron Process Architecture

1. **Main Process** (`src/main/index.ts`) - App lifecycle, OSC server/client, IPC handlers
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

## Plugin System

### Plugin Structure

Plugins live in `src/plugins/` and are dynamically loaded via Vite's `import.meta.glob()`. Each plugin folder contains:

```
src/plugins/hydra/
├── manifest.json      # Plugin metadata (id, name, author, version, outputTypes)
├── index.ts           # Plugin definition export
├── init.ts            # Initialize plugin instance, create store
├── process.ts         # Main processing logic (called with poiesis text + config)
├── cleanup.ts         # Cleanup on instance unload
├── store.ts           # Zustand store factory (createStore)
├── schema.d.ts        # TypeScript types
└── ui/
    ├── Workspace.tsx  # Main editor/workspace UI
    ├── Renderer.tsx   # Canvas/graphics renderer (optional)
    ├── Monitor.tsx    # Bottom panel monitor view
    └── Options.tsx   # Options panel view
```

### Plugin Types (`src/types/plugins.ts`)

```typescript
type PluginManifest = {
  id: string
  name: string
  repo: string
  author: string
  version: string
  outputTypes: ('audio' | 'graphics' | 'editor')[]
  allowMultiple: boolean
}

type PluginDefinition<StoreType> = {
  manifest: PluginManifest
  init: (instanceId: string) => UseStore<StoreType>
  process: (instanceId: string, poiesis: string, config: ConfigurationJSON) => void
  cleanup: (instanceId: string) => void
  createStore: (instanceId: string) => UseStore<StoreType>
  // UI Components (all optional)
  Workspace?: FunctionComponent<WorkspaceProps>
  Options?: FunctionComponent<UIProps>
  Monitor?: FunctionComponent<UIProps>
  Renderer?: FunctionComponent<RendererProps>
}
```

### Plugin Instance Lifecycle

1. **Registration** - Plugin definition registered via `usePluginsStore.registerPlugin()`
2. **Loading** - `loadPlugin(pluginId)` creates new instance with unique `instanceId`
3. **Initialization** - `init(instanceId)` called, creates and returns Zustand store
4. **Processing** - `process(instanceId, poiesis, config)` called with input text
5. **Cleanup** - `cleanup(instanceId)` called when instance unloaded

### Adding Graphics Sources

Plugins with graphics output register their canvas with the compositor:

```typescript
// In init.ts
import { useGraphicsStore } from '@renderer/stores/useGraphicsStore'

export default function init(instanceId: string) {
  const useStore = createStore(instanceId)

  const canvas = document.createElement('canvas')
  canvas.width = 1920
  canvas.height = 1080
  canvas.getContext('webgl', { preserveDrawingBuffer: true })

  const { addGraphicsSource, addEditorSource } = useGraphicsStore.getState()
  addGraphicsSource({ id: instanceId, canvas })
  addEditorSource({ id: instanceId }) // If plugin has editor overlay

  return useStore
}
```

**Important:** Use `preserveDrawingBuffer: true` for WebGL contexts read by the Compositor.

## Surfaces (System Plugins)

Surfaces are built-in plugins in `src/renderer/src/surfaces/`. Same structure as plugins but registered directly at app startup:

- **Poiesis** (`surfaces/poiesis/`) - Text input with keyword-based shader effects
- **Config** (`surfaces/config/`) - YAML configuration editor

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
  compositorRef: Compositor | null

  addGraphicsSource: ({ id, canvas, initParams? }) => void
  addEditorSource: ({ id, initParams? }) => void
  updateParams: (id, type, updates) => void
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
- Renders compositor canvas (graphics sources)
- Overlays editor sources with CSS `mixBlendMode`
- Shares Zustand stores with main window (same renderer process)

## UI Layout

### Layout Structure (`src/renderer/src/components/Layout.tsx`)

```
┌─────────────────────────────────────────────────┐
│  Workspace (66%)        │  Options (34%)       │
│  - Plugin Workspace     │  - Plugin Options    │
│  - Plugin Renderer      │                       │
├─────────────────────────┴───────────────────────┤
│  Mixer (25%)            │  Monitors (75%)       │
│  - Preset buttons       │  - Plugin Monitors    │
│  - Editor controls      │                       │
│  - Graphics controls    │                       │
└─────────────────────────────────────────────────┘
```

### Main Components

- **Workspace.tsx** - Displays focused plugin's Workspace + Renderer, AddPlugin dropdown
- **Mixer.tsx** - Alpha/enabled controls for editors and graphics sources
- **Monitors.tsx** - Renders active plugins' Monitor components in tabs
- **Options.tsx** - Renders active plugins' Options components in tabs

### Plugins Store (`src/renderer/src/stores/usePluginsStore.ts`)

```typescript
interface PluginsManagerState {
  registered: Record<string, PluginDefinition> // Available plugins
  active: Record<string, ActivePlugin> // Running instances
  focused: string | null // Currently focused instanceId

  registerPlugin: (plugin) => void
  loadPlugin: (pluginId) => void
  unloadPlugin: (instanceId) => void
  getInstance: (instanceId) => ActivePlugin
  setFocused: (focused) => void
}
```

## OSC Communication

### Ports

- **5459** - Electron sends OSC (outgoing)
- **5460** - Electron receives OSC (incoming)

### Server (`src/main/osc/server.ts`)

- Pattern-based message routing with wildcards
- EventEmitter architecture
- Forwards all messages to renderer via `osc:message` event

### Client (`src/main/osc/client.ts`)

- Generic `send(address, args)` method
- Handles type conversion (numbers, strings, booleans)

## Claude API Communication

The Claude API is accessed securely through the main process, keeping API keys out of the renderer.

### Architecture

1. **Main Process** (`src/main/claude/client.ts`) - Singleton client managing Anthropic SDK
2. **IPC Handler** (`src/main/index.ts`) - `claude:sendMessage` handler
3. **Preload Script** (`src/preload/index.ts`) - Exposes `window.api.claude.sendMessage()`
4. **Types** (`src/types/claude.ts`) - TypeScript definitions for Claude API

### Client (`src/main/claude/client.ts`)

Singleton service that:

- Initializes Anthropic client with API key from `process.env.CLAUDE_API_KEY`
- Provides `sendMessage()` method for conversation-style interactions
- Handles errors and returns structured results

### Usage in Renderer

```typescript
const result = await window.api.claude.sendMessage({
  messages: [
    { role: 'user', content: 'Hello!' },
    { role: 'assistant', content: 'Hi there!' },
    { role: 'user', content: 'How are you?' }
  ],
  system: 'You are a helpful assistant...',
  model: 'claude-sonnet-4-6', // Optional, defaults to sonnet-4-6
  maxTokens: 128 // Optional, defaults to 128
})

if (result.success) {
  console.log('Claude response:', result.content)
} else {
  console.error('Error:', result.error)
}
```

### Security

- API key is **only** accessible in the main process (Node.js environment)
- Renderer process communicates via IPC, never directly with Anthropic API
- Follows Electron security best practices for API key management

## Styling

- **Tailwind CSS v4** with stone color palette
- Background: `bg-stone-950` (body), `bg-stone-800` (dividers), `bg-stone-700` (panels)
- Text: `text-stone-100`
- Hover: `hover:bg-stone-600`, `hover:bg-stone-800`

## Path Aliases

- `@renderer` → `src/renderer/src/`
- `@plugins` → `src/plugins/`

## TypeScript Configuration

- `tsconfig.node.json` - Main and preload (Node.js)
- `tsconfig.web.json` - Renderer (DOM)
- `tsconfig.json` - Root config

## Creating a New Plugin

1. Create folder: `src/plugins/my-plugin/`
2. Add `manifest.json`:
   ```json
   {
     "id": "my-plugin",
     "name": "My Plugin",
     "repo": "",
     "author": "your-name",
     "version": "1.0.0",
     "outputTypes": ["graphics"],
     "allowMultiple": true
   }
   ```
3. Create store factory in `store.ts`:

   ```typescript
   import { PluginState } from 'src/types/plugins'
   import { create } from 'zustand'

   export interface MyPluginState extends PluginState {
     // Your state here
   }

   export const createMyPluginStore = (instanceId: string) => {
     return create<MyPluginState>((set) => ({
       instanceId
       // Initial state and setters
     }))
   }
   ```

4. Create `init.ts`, `process.ts`, `cleanup.ts`
5. Create UI components in `ui/` folder
6. Export in `index.ts`:

   ```typescript
   import { PluginDefinition } from '../utils'
   import manifest from './manifest.json'
   // ... imports

   const MyPlugin: PluginDefinition<MyPluginState> = {
     manifest,
     init,
     process,
     cleanup,
     Workspace,
     createStore: createMyPluginStore
   }

   export default MyPlugin
   ```

Plugin will be automatically discovered and loaded at startup.

## Important Notes

- Each plugin instance gets its own Zustand store via `createStore(instanceId)`
- `instanceId` is a UUID generated when loading a plugin
- Multiple instances of the same plugin can run simultaneously
- Graphics sources must use `preserveDrawingBuffer: true` for WebGL
- Editor sources render as overlays in the performance window
- The compositor uses the target window's `requestAnimationFrame` for timing
