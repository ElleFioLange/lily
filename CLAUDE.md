# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lily is an Electron application with a minimal OSC (Open Sound Control) communication template. It provides a flexible foundation for building custom OSC-based control surfaces. Built with React, TypeScript, and Vite using the electron-vite build system.

### Core Architecture

The application provides a clean OSC communication layer:

1. **Electron App** (this codebase) - React UI with minimal OSC template system
2. **OSC Communication Layer** - Bidirectional UDP messaging on ports 5459 (outgoing) and 5460 (incoming)
3. **External OSC Application** - Any OSC-compatible application (Max/MSP, TouchOSC, Processing, etc.)

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

- Tailwind CSS v4 is configured for utility-first styling
- Uses standard Tailwind **stone** color palette (NOT slate or gray)
  - Background: `bg-stone-950` (body), `bg-stone-800` (dividers), `bg-stone-700` (panels)
  - Text: `text-stone-100` (primary text)
  - Hover states: `hover:bg-stone-600`, `hover:bg-stone-800`
- No custom CSS variables - uses Tailwind's built-in color scales
- Tailwind config: `tailwind.config.js` (minimal config, no custom colors)
- PostCSS config: `postcss.config.js`
- Main CSS file: `src/renderer/src/assets/main.css` (uses Tailwind v4 `@import 'tailwindcss'` syntax)

## OSC Communication Template

### Architecture Overview

The OSC system is a minimal, well-documented template designed for customization. It provides the foundation for building any OSC protocol.

**Documentation**: See `docs/OSC.md` for comprehensive guide including:

- Architecture diagrams and message flow
- Pattern matching and routing
- TypeScript typing patterns
- State management integration
- Best practices and examples

**Ports**:

- **5459** - Electron sends OSC messages (outgoing to external app)
- **5460** - Electron receives OSC messages (incoming from external app)

**OSC Server** (`src/main/osc/server.ts`):

- Minimal template with pattern-based message routing
- Supports wildcards: `/path/*` (single segment) and `/path/**` (multiple segments)
- EventEmitter architecture for flexible handling
- Generic `message` event emits all incoming messages
- Extensible: register pattern handlers like `server.on('/synth/*', handler)`

**OSC Client** (`src/main/osc/client.ts`):

- Minimal template with generic `send(address, args)` method
- No predefined message methods - build your own in application code
- Handles automatic type conversion (numbers, strings, booleans)
- Extensible: create helper functions or extend the class

**Message Types** (`src/types/osc-messages.ts`):

- Generic `OSCMessage` interface: `{ address: string, args: OSCValue[] }`
- Helper functions: `isAddress()`, `hasPrefix()`, `parseAddress()`
- `OSCMessageBuilder` for fluent message construction
- Commented examples showing how to define custom message types

### State Management

**Zustand Store Template** (`src/renderer/src/stores/useLiveStore.ts`):

- Minimal template store called `useOSCStore`
- Contains only `lastMessage` state and generic `sendMessage()` action
- Includes `setupOSCListeners()` function pattern for wiring incoming messages
- Extensive commented examples showing common patterns

**Recommended Pattern**:

1. User interacts with UI component
2. Component calls store action (e.g., `sendMessage('/synth/freq', [440])`)
3. Action sends OSC via `window.api.osc.send(address, args)`
4. Action updates local state immediately (optimistic update)
5. External app processes message and sends confirmation back
6. OSC listener updates state with confirmed value

**Building Custom Stores**:

- Define your own state shape based on your OSC protocol
- Create actions that call `window.api.osc.send()`
- Use `setupOSCListeners()` to route incoming messages to state updates
- See examples in `useLiveStore.ts` for common patterns (separate stores, pattern routing, etc.)

### External OSC Applications

The app can communicate with any OSC-compatible application. Examples include Max/MSP, TouchOSC, Processing, Pure Data, etc.

**Max for Live Device Support** (`src/main/maxdevice/export.ts`):

- `exportMaxDevice()` - Shows save dialog for exporting Max devices
- `quickInstallMaxDevice()` - Auto-installs to Ableton User Library
- Both methods accessible via `window.api.maxDevice.*`

**OSC Application Requirements**:

- Receive OSC on port **5459** (messages from Electron)
- Send OSC to port **5460** on `localhost` (messages to Electron)
- Use any OSC address patterns that suit your application
- Define your protocol and implement corresponding handlers in Electron

### Component Structure

**App.tsx** - Root component that:

- Calls `setupOSCListeners()` on mount to wire OSC events to store
- Calls `setupLayoutListeners()` to wire layout switching from menu
- Customize initialization for your application (e.g., send handshake message)
- Conditionally renders one of three layouts based on `useLayoutStore` state

**Layout Switching**:

- Three layouts available via View > Layout menu:
  - **PerformanceLayout** - Main performance view (default)
  - **AbletonConfigurationLayout** - Ableton configuration view
  - **HydraConfigurationLayout** - Hydra configuration view
- Layout state managed by `useLayoutStore` (Zustand)
- Menu selection synced via IPC from main process

**Common Layouts** (`src/renderer/src/components/`):

All three layouts currently share the same structure:

- Left section (70%): Live preview (top 60%) + Ableton monitor (bottom 40%)
- Right section (30%): Hydra preview (top 30%) + Video controls (20%) + Hydra patches (bottom 50%)
- Right sidebar (15%): Project Config (collapsible)
- Built with `react-resizable-panels` for resizable/collapsible panels
- Resize handles: `bg-stone-800` with `h-px` or `w-px` thickness

**Base Components**:

- **Panel** (`src/renderer/src/components/common/Panel.tsx`) - Reusable panel wrapper
  - Props: `title`, `collapsible`, `headerActions`, `children`, `className`, `contentClassName`, `panelId`
  - Default styling: `text-stone-100` text, `hover:bg-stone-800` buttons
  - Handles collapse/expand state internally
  - When `panelId` is provided, panel becomes focusable and updates focus store

**Panel Components** (`src/renderer/src/components/panels/`):

- **LivePreview.tsx** - Placeholder for live video preview (future: camera/video input)
- **HydraPreview.tsx** - Hydra visual synthesizer preview with collapse button and video controls
- **AbletonMonitor.tsx** - Example panel with button that sends custom OSC message via `window.api.osc.send()`
- **HydraPatches.tsx** - Placeholder for Hydra patch browser/editor
- **VideoControls.tsx** - Video control panel
- **ProjectConfig.tsx** - YAML configuration editor with CodeMirror, navigation, and file persistence

### Keyboard Shortcuts

**Focus Management** (`src/renderer/src/stores/useFocusStore.ts`):

- Tracks which panel is currently focused using Zustand
- Panel IDs: `'live-preview'`, `'ableton-monitor'`, `'hydra-preview'`, `'video-controls'`, `'hydra-patches'`, `'project-config'`
- Panels become focusable when assigned a `panelId` prop
- Panel component handles focus/blur events and updates store

**Keyboard Shortcut System** (`src/renderer/src/hooks/useKeyboardShortcuts.ts`):

- Centralized hook that manages all keyboard shortcuts
- Initialized in `App.tsx` via `useKeyboardShortcuts()`
- Supports global shortcuts and panel-specific shortcuts
- **Text Input Bypass**: Shortcuts can optionally activate even when typing in text inputs

**Global Shortcuts**:

- **Cmd/Ctrl+1** - Switch to Performance layout
- **Cmd/Ctrl+2** - Switch to Ableton Configuration layout
- **Cmd/Ctrl+3** - Switch to Hydra Configuration layout
- **Cmd/Ctrl+R** - Request OSC init from Max device

**Panel-Specific Shortcuts** (examples):

- **LivePreview Panel**: Ctrl+Shift+Enter (with `bypassTextInputs: true`)
- **AbletonMonitor Panel**: Tab key

**Adding New Shortcuts**:

```typescript
// In useKeyboardShortcuts.ts, add to shortcuts array:

// Global shortcut
{
  key: 'p',
  modifiers: ['ctrl'],
  handler: () => { /* action */ },
  description: 'Play/Pause'
}

// Panel-specific shortcut
{
  panelId: 'live-preview',
  key: 'Enter',
  modifiers: ['ctrl', 'shift'],
  handler: () => { /* action */ },
  bypassTextInputs: true,  // Optional: works even in text inputs
  description: 'Submit input'
}
```

**Modifier Keys**: `'ctrl'`, `'shift'`, `'alt'`, `'meta'` (Cmd on macOS maps to Ctrl for cross-platform compatibility)

**Panel IDs**: Pass `panelId` prop to panel components in layouts:

```typescript
<LivePreview panelId="live-preview" />
<AbletonMonitor panelId="ableton-monitor" />
```

### Configuration System

**YAML Configuration Editor** (`src/renderer/src/components/panels/ProjectConfig.tsx`):

- Full-featured YAML editor powered by CodeMirror 6
- Syntax highlighting with stone color theme
- Code folding for objects and arrays
- Navigation panel showing top-level keys (collapsible)
- Click navigation to scroll to specific keys
- Load/Save/Reset buttons for file operations
- Real-time YAML validation with error display
- File path display

**Configuration Store** (`src/renderer/src/stores/useConfigurationStore.ts`):

- Zustand store managing configuration state
- State: `config` (YAML string), `configPath`, `isValid`, `error`
- Actions: `setConfig()`, `loadConfig()`, `saveConfig()`, `resetConfig()`
- File location: `lily.config.yaml` in Electron `userData` directory
- Default template with project, OSC, UI, and custom sections

**Default Configuration Structure**:

```yaml
# Project metadata and settings
project:
  name: Lily Project
  version: "1.0.0"
  author: ""

# Open Sound Control configuration
osc:
  outputPort: 5459
  inputPort: 5460
  targetHost: localhost

# User interface settings
ui:
  theme: dark
  defaultLayout: performance
  panelSizes: {}

# Add your own configuration here
custom: {}
```

**CodeMirror Extensions Used**:

- `yaml()` - YAML language support
- `foldGutter()` - Code folding UI
- `lineNumbers()` - Line number gutter
- `highlightActiveLine()` - Active line highlighting
- Custom stone theme matching application palette

**File Operations** (via Electron IPC):

- `window.api.config.load()` - Load from disk
- `window.api.config.save(content)` - Save to disk
- `window.api.config.getPath()` - Get file path

**Components**:

- **YAMLEditor** (`src/renderer/src/components/YAMLEditor.tsx`) - CodeMirror wrapper
- **JSONNavigation** (`src/renderer/src/components/JSONNavigation.tsx`) - Key navigation panel

**Usage**:

```typescript
// Access config store
const { config, setConfig, loadConfig, saveConfig } = useConfigurationStore()

// Load configuration from disk
await loadConfig()

// Update configuration
setConfig(newYamlString)

// Save configuration to disk
await saveConfig()
```

**Legacy/Example Components** (simplified to placeholders with guidance):

- **ConnectionStatus** (`src/renderer/src/components/ConnectionStatus.tsx`) - Shows last OSC message, Max device export buttons
- **TransportControls** (`src/renderer/src/components/transport/TransportControls.tsx`) - Placeholder with guidance on rebuilding
- **MixerSection** (`src/renderer/src/components/mixer/MixerSection.tsx`) - Placeholder with guidance on rebuilding
- **MixerChannel** (`src/renderer/src/components/mixer/MixerChannel.tsx`) - Example type definitions for rebuilding

### Development Workflow

1. **Start Electron app**: `pnpm dev`
2. **Read the OSC guide**: See `docs/OSC.md` for comprehensive documentation
3. **Define your OSC protocol**: Decide on message addresses and argument types
4. **Implement message types**: Create TypeScript interfaces in `src/types/osc-messages.ts`
5. **Build store actions**: Create Zustand actions that send OSC via `window.api.osc.send()`
6. **Set up listeners**: Use `setupOSCListeners()` to route incoming messages to state
7. **Create UI components**: Build React components that use your store
8. **Test with external OSC app**: Set up your OSC application to communicate on ports 5459/5460

**Example: Adding a new message type**

```typescript
// 1. Define the type (src/types/osc-messages.ts)
interface MySynthMessage extends OSCMessage {
  address: '/synth/freq'
  args: [number]
}

// 2. Add store action (src/renderer/src/stores/useLiveStore.ts)
setSynthFreq: async (freq: number) => {
  await window.api.osc.send('/synth/freq', [freq])
  set({ synthFreq: freq })
}

// 3. Add listener routing
window.api.osc.onMessage((msg) => {
  if (msg.address === '/synth/freq') {
    store.setSynthFreq(msg.args[0] as number)
  }
})

// 4. Use in component
const freq = useMyStore((state) => state.synthFreq)
const setFreq = useMyStore((state) => state.setSynthFreq)
```

### Important Notes

- OSC server/client initialize automatically when main process starts (`initializeOSC()` in `src/main/index.ts`)
- IPC handlers are registered in `setupIPCHandlers()` - only one handler needed: `osc:send`
- All OSC methods exposed via `window.api.osc.*` are async and return Promises
- The generic `send(address, args)` method is the only send method - build your own helpers on top
- OSC server forwards all messages to renderer via `osc:message` event
- Pattern-based routing is available - register handlers in main process with `oscServer.on(pattern, handler)`
- See `docs/OSC.md` for complete API reference and examples
