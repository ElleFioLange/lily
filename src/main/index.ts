import { app, shell, BrowserWindow, ipcMain, Menu, dialog, FileFilter } from 'electron'
import { join, relative, sep } from 'path'
import { homedir } from 'os'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { promises as fs } from 'fs'
import { getSettingsManager } from './settings/manager'
import type { Settings } from '../types/settings'
import { getAudifyCapture } from './audio/audify-capture'
import type { AudioDevice, AudioCaptureStatus } from '../types/audio'

// Initialize settings manager
const settingsManager = getSettingsManager()

let mainWindowRef: BrowserWindow | null = null
let settingsWindowRef: BrowserWindow | null = null
let performanceWindowRef: BrowserWindow | null = null

function createMenu(): void {
  const isMac = process.platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              {
                label: 'Settings...',
                accelerator: 'CmdOrCtrl+,',
                click: () => createSettingsWindow()
              },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),

    // File menu: .lly session files
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Session...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindowRef?.webContents.send('session:menu', 'open')
        },
        { type: 'separator' as const },
        {
          label: 'Save Session',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindowRef?.webContents.send('session:menu', 'save')
        },
        {
          label: 'Save Session As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindowRef?.webContents.send('session:menu', 'saveAs')
        }
      ]
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const }
            ]
          : [
              { role: 'delete' as const },
              { type: 'separator' as const },
              { role: 'selectAll' as const },
              { type: 'separator' as const },
              {
                label: 'Settings...',
                accelerator: 'CmdOrCtrl+,',
                click: () => createSettingsWindow()
              }
            ])
      ]
    },

    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
        { type: 'separator' as const }
      ]
    },

    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        { type: 'separator' as const },
        {
          label: 'Open Performance Window',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => {
            mainWindowRef?.webContents.send('performance:toggle')
          }
        },
        {
          label: 'Toggle Performance Full Screen',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => {
            const win = performanceWindowRef
            if (win && !win.isDestroyed()) win.setFullScreen(!win.isFullScreen())
          }
        },
        {
          label: 'Toggle Preview',
          accelerator: 'CmdOrCtrl+Alt+P',
          click: () => {
            mainWindowRef?.webContents.send('preview:toggle')
          }
        },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const }
            ]
          : [{ role: 'close' as const }])
      ]
    },

    // Actions menu
    {
      label: 'Actions',
      submenu: [
        {
          label: 'Run',
          accelerator: 'CmdOrCtrl+Shift+Enter',
          click: () => {
            mainWindowRef?.webContents.send('actions:run')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  // Store reference for IPC event forwarding
  mainWindowRef = mainWindow

  // Create application menu
  createMenu()

  // Handle window.open() calls from renderer
  mainWindow.webContents.setWindowOpenHandler(({ url, features }) => {
    // Allow performance window (blank URL opened with 'performance' name)
    if ((url === '' || url === 'about:blank') && features.includes('width=1920')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 1920,
          height: 1080,
          backgroundColor: '#000000',
          title: 'Performance',
          webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            nodeIntegration: false,
            contextIsolation: true
          }
        }
      }
    }

    // External URLs open in system browser
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // The performance window is the only child window allowed above
  mainWindow.webContents.on('did-create-window', (win) => {
    performanceWindowRef = win
    win.on('closed', () => {
      if (performanceWindowRef === win) performanceWindowRef = null
    })
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createSettingsWindow(): void {
  // Don't create duplicate windows
  if (settingsWindowRef && !settingsWindowRef.isDestroyed()) {
    settingsWindowRef.focus()
    return
  }

  const settingsWindow = new BrowserWindow({
    width: 600,
    height: 400,
    title: 'Settings',
    resizable: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  settingsWindowRef = settingsWindow

  // Load settings HTML
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    settingsWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/settings.html`)
  } else {
    settingsWindow.loadFile(join(__dirname, '../renderer/settings.html'))
  }

  // Cleanup on close
  settingsWindow.on('closed', () => {
    settingsWindowRef = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Load settings
  await settingsManager.load()

  // Initialize audio capture streaming (used by Poiesis audio-reactive keywords)
  initializeAudioStreaming()

  // Setup IPC handlers
  setupIPCHandlers()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Cleanup on quit
app.on('before-quit', () => {
  const audioCapture = getAudifyCapture()
  audioCapture.stop()
})

/**
 * Initialize audio capture streaming
 * Forwards audio buffers from audify to renderer process
 */
function initializeAudioStreaming(): void {
  const audioCapture = getAudifyCapture()

  // Forward audio buffers to main window (performance window shares the renderer)
  audioCapture.on('buffer', (data: Float32Array, metadata) => {
    mainWindowRef?.webContents.send('audio:buffer', {
      buffer: data,
      channels: metadata.channels,
      sampleRate: metadata.sampleRate,
      timestamp: metadata.timestamp
    })
  })

  // Forward error events
  audioCapture.on('error', (error: Error) => {
    mainWindowRef?.webContents.send('audio:error', error.message)
  })

  // Forward status events
  audioCapture.on('started', () => {
    mainWindowRef?.webContents.send('audio:started')
  })

  audioCapture.on('stopped', () => {
    mainWindowRef?.webContents.send('audio:stopped')
  })

  console.log('Audio capture streaming initialized')
}

/**
 * Setup IPC Handlers
 *
 * Registers IPC handlers for communication between renderer and main process.
 */
function setupIPCHandlers(): void {
  // ============================================================================
  // File System Handler
  // ============================================================================
  ipcMain.handle('files:open', async (_, filters: FileFilter[]) => {
    try {
      const result = await dialog.showOpenDialog(mainWindowRef!, {
        title: 'Open File',
        filters,
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'No file selected' }
      }

      const filePath = result.filePaths[0]
      const content = await fs.readFile(filePath, 'utf-8')
      return { success: true, content, path: filePath }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to open file'
      }
    }
  })

  ipcMain.handle('files:save', async (_, content: string, path: string) => {
    try {
      await fs.writeFile(path, content, 'utf-8')
      return { success: true, path }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save file'
      }
    }
  })

  ipcMain.handle(
    'files:saveAs',
    async (_, filters: FileFilter[], defaultPath: string, content: string) => {
      try {
        const result = await dialog.showSaveDialog(mainWindowRef!, {
          title: 'Save File',
          defaultPath,
          filters
        })

        if (result.canceled || !result.filePath) {
          return { success: false, error: 'No file selected' }
        }

        await fs.writeFile(result.filePath, content, 'utf-8')
        return { success: true, path: result.filePath }
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to save file'
        }
      }
    }
  )
  // ============================================================================
  // Session Files (.lly)
  // ============================================================================
  ipcMain.handle('session:write', async (_, content: string, path: string) => {
    try {
      await fs.writeFile(path, content, 'utf-8')
      return { success: true, path }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save session'
      }
    }
  })

  ipcMain.handle('session:saveAs', async (_, content: string, suggestedName?: string) => {
    try {
      const result = await dialog.showSaveDialog(mainWindowRef!, {
        title: 'Save Lily Session',
        defaultPath: join(
          settingsManager.get().workingDirectory ?? '',
          suggestedName ?? 'session.lly'
        ),
        filters: [{ name: 'Lily Session', extensions: ['lly'] }]
      })
      if (result.canceled || !result.filePath) return { success: false, error: 'No file selected' }
      const path = result.filePath.endsWith('.lly') ? result.filePath : `${result.filePath}.lly`
      await fs.writeFile(path, content, 'utf-8')
      return { success: true, path }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save session'
      }
    }
  })

  ipcMain.handle('session:open', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindowRef!, {
        title: 'Open Lily Session',
        defaultPath: settingsManager.get().workingDirectory ?? undefined,
        filters: [{ name: 'Lily Session', extensions: ['lly'] }],
        properties: ['openFile']
      })
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'No file selected' }
      }
      const path = result.filePaths[0]
      const content = await fs.readFile(path, 'utf-8')
      return { success: true, content, path }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to open session'
      }
    }
  })

  // ============================================================================
  // Working Directory (file browser)
  // ============================================================================
  ipcMain.handle('workdir:get', async (): Promise<string | null> => {
    const saved = settingsManager.get().workingDirectory
    if (saved && (await isDirectory(saved))) return saved
    // Launched from a terminal (e.g. pnpm dev): use where it was launched from. A packaged
    // app starts in / or the home folder, which are too big to list, so wait for a pick.
    const cwd = process.cwd()
    return cwd === '/' || cwd === homedir() ? null : cwd
  })

  ipcMain.handle('workdir:open', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog(mainWindowRef!, {
      title: 'Open Working Directory',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const directory = result.filePaths[0]
    await saveWorkingDirectory(directory)
    return directory
  })

  ipcMain.handle('workdir:set', async (_, directory: string): Promise<string | null> => {
    if (!(await isDirectory(directory))) return null
    await saveWorkingDirectory(directory)
    return directory
  })

  ipcMain.handle('workdir:list', async (_, directory: string) => listJsFiles(directory))

  // ============================================================================
  // Hydra File Handlers
  // ============================================================================
  ipcMain.handle('hydra:save', async (_, content: string, path: string) => {
    try {
      await fs.writeFile(path, content, 'utf-8')
      return { success: true, path }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save shader'
      }
    }
  })

  ipcMain.handle('hydra:read', async (_, path: string) => {
    try {
      const content = await fs.readFile(path, 'utf-8')
      return { success: true, content, path }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to read file'
      }
    }
  })

  ipcMain.handle('hydra:open', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindowRef!, {
        title: 'Open Hydra Shader File',
        defaultPath: settingsManager.get().workingDirectory ?? undefined,
        filters: [
          { name: 'JavaScript Files', extensions: ['js'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'No file selected' }
      }

      const filePath = result.filePaths[0]
      const content = await fs.readFile(filePath, 'utf-8')
      return { success: true, content, path: filePath }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to open file'
      }
    }
  })

  ipcMain.handle('hydra:saveAs', async (_, content: string) => {
    try {
      const result = await dialog.showSaveDialog(mainWindowRef!, {
        title: 'Save Hydra Shader File',
        defaultPath: join(settingsManager.get().workingDirectory ?? '', 'new-shader.js'),
        filters: [
          { name: 'JavaScript Files', extensions: ['js'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'No file selected' }
      }

      await fs.writeFile(result.filePath, content, 'utf-8')
      return { success: true, path: result.filePath }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save file'
      }
    }
  })

  // ============================================================================
  // Configuration File Handlers
  // ============================================================================
  ipcMain.handle('config:save', async (_, content: string, path: string) => {
    try {
      await fs.writeFile(path, content, 'utf-8')
      return { success: true, path }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to save config' }
    }
  })

  ipcMain.handle('config:saveAs', async (_, content: string) => {
    try {
      const result = await dialog.showSaveDialog(mainWindowRef!, {
        title: 'Save Configuration File',
        defaultPath: 'config.yaml',
        filters: [
          { name: 'YAML Files', extensions: ['yaml', 'yml'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'No file selected' }
      }

      await fs.writeFile(result.filePath, content, 'utf-8')
      return { success: true, path: result.filePath }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to save config' }
    }
  })

  ipcMain.handle('config:open', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindowRef!, {
        title: 'Open Configuration File',
        filters: [
          { name: 'YAML Files', extensions: ['yaml', 'yml'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'No file selected' }
      }

      const filePath = result.filePaths[0]
      const content = await fs.readFile(filePath, 'utf-8')
      return { success: true, content, path: filePath }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to open config' }
    }
  })

  // ============================================================================
  // Audio Capture Handlers
  // ============================================================================
  ipcMain.handle('audio:list-devices', async (): Promise<AudioDevice[]> => {
    const audioCapture = getAudifyCapture()
    return await audioCapture.listDevices()
  })

  ipcMain.handle(
    'audio:start',
    async (_, deviceId?: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const audioCapture = getAudifyCapture()
        await audioCapture.start(deviceId)
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to start audio capture'
        }
      }
    }
  )

  ipcMain.handle('audio:stop', async (): Promise<{ success: boolean }> => {
    try {
      const audioCapture = getAudifyCapture()
      audioCapture.stop()
      return { success: true }
    } catch (error) {
      return { success: false }
    }
  })

  ipcMain.handle('audio:get-status', async (): Promise<AudioCaptureStatus> => {
    const audioCapture = getAudifyCapture()
    return audioCapture.getStatus()
  })

  // ============================================================================
  // Settings Handlers
  // ============================================================================
  ipcMain.handle('settings:get', async (): Promise<Settings> => {
    return settingsManager.get()
  })

  ipcMain.handle('settings:save', async (_, settings: Settings): Promise<void> => {
    await settingsManager.set(settings)
  })
}

// ============================================================================
// Working directory helpers
// ============================================================================
const WORKDIR_SKIP = new Set(['node_modules'])
const WORKDIR_MAX_DEPTH = 6
const WORKDIR_MAX_FILES = 1000

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await fs.stat(path)).isDirectory()
  } catch {
    return false
  }
}

async function saveWorkingDirectory(directory: string): Promise<void> {
  await settingsManager.set({ ...settingsManager.get(), workingDirectory: directory })
}

/**
 * Every .js file under a directory, skipping hidden folders and node_modules.
 * Capped in depth and count so opening a huge folder can't hang the app.
 */
async function listJsFiles(
  root: string
): Promise<{ files: { name: string; path: string; relativePath: string }[]; truncated: boolean }> {
  const files: { name: string; path: string; relativePath: string }[] = []
  let truncated = false

  const walk = async (directory: string, depth: number): Promise<void> => {
    if (truncated) return
    let entries: import('fs').Dirent[]
    try {
      entries = await fs.readdir(directory, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        if (!WORKDIR_SKIP.has(entry.name) && depth < WORKDIR_MAX_DEPTH) await walk(path, depth + 1)
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        if (files.length >= WORKDIR_MAX_FILES) {
          truncated = true
          return
        }
        files.push({
          name: entry.name,
          path,
          relativePath: relative(root, path).split(sep).join('/')
        })
      }
    }
  }

  await walk(root, 0)
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
  return { files, truncated }
}
