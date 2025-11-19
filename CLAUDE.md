# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lily is an Electron application built with React, TypeScript, and Vite using the electron-vite build system. It follows a three-process architecture:

1. **Main Process** (`src/main/index.ts`) - The Node.js backend that manages the Electron app lifecycle, creates browser windows, and handles IPC communication
2. **Preload Script** (`src/preload/index.ts`) - A secure bridge that exposes selected Electron APIs to the renderer process via `contextBridge`
3. **Renderer Process** (`src/renderer/`) - The React frontend that runs in the browser window

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
