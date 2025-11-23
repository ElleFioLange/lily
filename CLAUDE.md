# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lily is an Electron application that provides a custom control surface for Ableton Live. It communicates with Ableton via OSC (Open Sound Control) messages through a Max for Live device. Built with React, TypeScript, and Vite using the electron-vite build system.

### Core Architecture

The application follows a three-tier architecture:

1. **Electron App** (this codebase) - Control surface UI with transport controls, mixer (8 tracks), and scene launching
2. **OSC Communication Layer** - Bidirectional UDP messaging on ports 5459 (outgoing) and 5460 (incoming)
3. **Max for Live Device** (`resources/max-devices/lily-controller.amxd`) - Bridges OSC messages to Ableton's Live API

### Electron Process Architecture

1. **Main Process** (`src/main/index.ts`) - Manages app lifecycle, OSC server/client, and IPC handlers
2. **Preload Script** (`src/preload/index.ts`) - Exposes OSC and Max device APIs to renderer via `contextBridge`
3. **Renderer Process** (`src/renderer/`) - React UI with Zustand state management

## Development Commands

**Package Manager**: Use `pnpm` for all package management operations.

**Development**:

- `pnpm dev` - Start the development server with hot module reload (HMR)
- `pnpm start` - Preview the built application

**Type Checking**:

- `pnpm typecheck` - Type check all code (both Node and web)
- `pnpm typecheck:node` - Type check main and preload processes
- `pnpm typecheck:web` - Type check renderer process only

**Code Quality**:

- `pnpm lint` - Run ESLint with caching enabled
- `pnpm format` - Format all code with Prettier

**Building**:

- `pnpm build` - Type check and build for development (outputs to `out/`)
- `pnpm build:mac` - Build macOS application (DMG)
- `pnpm build:win` - Build Windows application (NSIS installer)
- `pnpm build:linux` - Build Linux applications (AppImage, snap, deb)
- `pnpm build:unpack` - Build without packaging (for testing)

## Architecture Notes

**IPC Communication**:

- The preload script uses `contextBridge` to safely expose Electron APIs to the renderer
- Custom APIs should be added to the `api` object in `src/preload/index.ts` and properly typed in `src/preload/index.d.ts`
- Example IPC channel: 'ping' handler in main process (line 53 of `src/main/index.ts`)

**Path Aliasing**:

- Renderer code can use `@renderer` alias to reference `src/renderer/src/`
- Configured in `electron.vite.config.ts`

**Build Output**:

- Development builds go to `out/` directory
- Production distributables go to `dist/` directory
- Main process outputs to `out/main/index.js`
- Preload script outputs to `out/preload/index.js`
- Renderer HTML/JS outputs to `out/renderer/`

**TypeScript Configuration**:

- Three separate tsconfig files for different environments:
  - `tsconfig.node.json` - Main and preload processes (Node.js environment)
  - `tsconfig.web.json` - Renderer process (DOM environment)
  - `tsconfig.json` - Root config that references both

**Security**:

- Context isolation is enabled by default
- Sandbox is disabled (`sandbox: false` in webPreferences) - be cautious when modifying
- External links automatically open in the system browser, not in the Electron window

**Code Formatting**:

- Prettier is the default formatter for TypeScript, JavaScript, and JSON files
- VSCode will auto-format on save using Prettier
- Run `pnpm format` after making changes to ensure consistency

**Styling**:

- Tailwind CSS is configured for utility-first styling
- Custom color variables mapped from existing CSS variables (`--ev-c-*` and `--color-*`)
- Tailwind config: `tailwind.config.js`
- PostCSS config: `postcss.config.js`
- Main CSS file includes Tailwind directives: `src/renderer/src/assets/main.css`

## Lily-Specific Architecture

### OSC Communication

**Ports**:

- **5459** - Electron sends OSC messages to Max device (outgoing)
- **5460** - Electron receives OSC messages from Max device (incoming)

**OSC Server** (`src/main/osc/server.ts`):

- Listens on port 5460 for messages from Max/Ableton
- Emits events: `message`, `transport:state`, `track:update`, `init:complete`
- Events are forwarded to renderer via IPC

**OSC Client** (`src/main/osc/client.ts`):

- Sends messages to port 5459 (Max device)
- Methods: `transportPlay()`, `transportStop()`, `transportSetTempo()`, `trackSetVolume()`, etc.

**Message Protocol** (defined in `src/types/osc-messages.ts`):

- Transport: `/live/transport/{play|stop|tempo}`
- Tracks: `/live/track/{0-7}/{volume|pan|mute|solo}`
- Scenes: `/live/scene/{0-7}/fire`
- Init: `/live/init/{request|complete}`

### State Management

**Zustand Store** (`src/renderer/src/stores/useLiveStore.ts`):

- Single source of truth for Ableton Live state
- State slices: `transport`, `tracks` (array of 8), `connection`
- Actions automatically send OSC messages and update local state optimistically
- `setupOSCListeners()` function wires incoming OSC messages to state updates

**State Flow**:

1. User interacts with UI component
2. Component calls store action (e.g., `setTrackVolume(0, 0.8)`)
3. Action sends OSC message via `window.api.osc.trackSetVolume(0, 0.8)`
4. Action updates local state immediately (optimistic update)
5. Max device processes message and sends confirmation back
6. OSC listener updates state with confirmed value from Ableton

### Max for Live Device

**Location**: `resources/max-devices/lily-controller.amxd`

**Bundling**:

- `resources/` folder is unpacked (not in asar) via `electron-builder.yml`
- Access bundled device path: `path.join(process.resourcesPath, 'resources/max-devices/lily-controller.amxd')`

**Export Functionality** (`src/main/maxdevice/export.ts`):

- `exportMaxDevice()` - Shows save dialog, user chooses location
- `quickInstallMaxDevice()` - Auto-installs to `~/Documents/Ableton/User Library/Presets/MIDI Effects/Max MIDI Effect`
- Both methods accessible via UI buttons in ConnectionStatus component

**Max Device Requirements**:

- Must use `udpreceive 5459` for incoming commands from Electron
- Must use `udpsend` to `localhost:5460` for outgoing state updates
- Should use `live.thisdevice` (not `loadbang`) for initialization
- Should use `defer` attribute on `live.observer` objects to prevent audio glitches
- Should send full state snapshot on init request

### Component Structure

**App.tsx** - Root component that:

- Calls `setupOSCListeners()` on mount to wire OSC events to store
- Calls `window.api.osc.requestInit()` to request initial state from Max device
- Renders the Layout component

**Layout** (`src/renderer/src/components/Layout.tsx`):

- Main container using `react-resizable-panels` for resizable/collapsible panel layout
- 4-panel split layout with Project Config sidebar
- Top-left: Live preview panel
- Top-right: Hydra preview panel
- Bottom-left: Ableton monitor panel
- Bottom-right: Hydra patches panel
- Right sidebar: Project Config panel (collapsible)
- Panels can be resized by dragging dividers
- Resize handles show visual indicators (|||, ☰)

**Panel Components** (`src/renderer/src/components/panels/`):

- **LivePreview.tsx** - Placeholder for live video preview (future: camera/video input)
- **HydraPreview.tsx** - Placeholder for Hydra visual synthesizer preview with collapse button and video controls section
- **AbletonMonitor.tsx** - Placeholder for Ableton Live state monitoring
- **HydraPatches.tsx** - Placeholder for Hydra patch browser/editor
- **ProjectConfig.tsx** - Placeholder for project configuration options

**Legacy Components** (currently unused, kept for reference):

- **ConnectionStatus** (`src/renderer/src/components/ConnectionStatus.tsx`) - Connection status indicator
- **TransportControls** (`src/renderer/src/components/transport/TransportControls.tsx`) - Play/Stop buttons and tempo control
- **MixerSection** (`src/renderer/src/components/mixer/MixerSection.tsx`) - 8-channel mixer grid
- **MixerChannel** (`src/renderer/src/components/mixer/MixerChannel.tsx`) - Individual mixer channel strip

### Development Workflow

1. **Start Electron app**: `pnpm dev`
2. **Create/edit Max device**: Open `resources/max-devices/lily-controller.amxd` in Max
3. **Install Max device to Ableton**: Click "Quick Install" in app UI
4. **Load device in Ableton**: Drag from User Library → MIDI Effects → Max MIDI Effect
5. **Test bidirectional communication**:
   - Change tempo in app → should update in Ableton
   - Change tempo in Ableton → should update in app UI

### Important Notes

- OSC server/client initialize automatically when main process starts (`initializeOSC()` in `src/main/index.ts`)
- IPC handlers are registered in `setupIPCHandlers()` function
- All OSC methods exposed via `window.api.osc.*` are async and return Promises
- Track indices are 0-based (0-7 for 8 tracks)
- Volume values are 0.0-1.0, pan values are -1.0 to 1.0
- Mute/solo values are sent as integers (0 or 1) but stored as booleans in state
