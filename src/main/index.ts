import { app, shell, BrowserWindow, ipcMain, Menu, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getOSCServer } from './osc/server'
import { getOSCClient } from './osc/client'
import {
  exportMaxDevice,
  quickInstallMaxDevice,
  checkMaxDeviceExists
} from '../plugins/ableton/maxdevice/export'
import { promises as fs } from 'fs'
import { getCameraWebSocketServer } from './camera/websocket-server'
import { networkInterfaces } from 'os'
import type { StartServerResult, StopServerResult } from '../types/camera'
import { getSettingsManager } from './settings/manager'
import type { Settings } from '../types/settings'
import { getAudifyCapture } from './audio/audify-capture'
import type { AudioDevice, AudioCaptureStatus } from '../types/audio'

// Initialize OSC server and client
const oscServer = getOSCServer({ port: 5460 })
const oscClient = getOSCClient({ port: 5459 })

// Initialize camera WebSocket server
const cameraServer = getCameraWebSocketServer()

// Initialize settings manager
const settingsManager = getSettingsManager()

let mainWindowRef: BrowserWindow | null = null
let settingsWindowRef: BrowserWindow | null = null

/**
 * Get local IP address for camera streaming
 */
function getLocalIPAddress(): string {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    const netGroup = nets[name]
    if (!netGroup) continue

    for (const net of netGroup) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return 'localhost'
}

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
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const }
            ]
          : [{ role: 'close' as const }])
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

  // Store reference for OSC event forwarding
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

  // Initialize OSC communication
  initializeOSC()

  // Initialize camera WebSocket forwarding
  initializeCameraStreaming()

  // Initialize audio capture streaming
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
  oscServer.stop()
  oscClient.close()
  cameraServer.stop()
  const audioCapture = getAudifyCapture()
  audioCapture.stop()
})

// Initialize OSC communication
async function initializeOSC(): Promise<void> {
  try {
    // Start OSC server
    await oscServer.start()

    // Initialize OSC client
    await oscClient.init()

    console.log('OSC communication initialized')

    // ============================================================================
    // Forward OSC Messages to Renderer
    // ============================================================================
    // The server emits 'message' events for all incoming OSC messages.
    // We forward these to the renderer process via IPC.
    //
    // To add pattern-specific forwarding, register additional listeners here:
    // Example:
    //   oscServer.on('/your/pattern', (message) => {
    //     mainWindowRef?.webContents.send('osc:pattern:/your/pattern', message)
    //   })

    oscServer.on('message', (message) => {
      mainWindowRef?.webContents.send('osc:message', message)
    })

    // Example: Forward specific patterns
    // Uncomment and modify these examples for your use case:
    /*
    oscServer.on('/synth/*', (message) => {
      mainWindowRef?.webContents.send('osc:pattern:/synth/*', message)
    })

    oscServer.on('/transport/play', (message) => {
      mainWindowRef?.webContents.send('osc:pattern:/transport/play', message)
    })
    */
  } catch (err) {
    console.error('Failed to initialize OSC:', err)
  }
}

/**
 * Initialize camera WebSocket streaming
 * Forwards camera frames from WebSocket clients to renderer process
 */
function initializeCameraStreaming(): void {
  // Forward camera frames to renderer
  cameraServer.on('frame', (frameBuffer: Buffer) => {
    mainWindowRef?.webContents.send('camera:frame', frameBuffer)
  })

  // Forward connection status updates
  cameraServer.on('clientConnected', ({ clientCount }) => {
    mainWindowRef?.webContents.send('camera:client-connected', clientCount)
  })

  cameraServer.on('clientDisconnected', ({ clientCount }) => {
    mainWindowRef?.webContents.send('camera:client-disconnected', clientCount)
  })

  console.log('Camera streaming initialized')
}

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
 * This includes the generic OSC send handler and other application-specific handlers.
 *
 * OSC Handler Pattern:
 * The generic 'osc:send' handler is the only OSC-related handler you need.
 * All application-specific OSC functionality should be built in the renderer
 * using this generic handler.
 *
 * Example (adding a custom handler if really needed):
 * ```typescript
 * ipcMain.handle('my-custom-action', async (_, param1, param2) => {
 *   // Do something complex that can't be done in renderer
 *   oscClient.send('/custom/address', [param1, param2])
 *   return { success: true }
 * })
 * ```
 */
function setupIPCHandlers(): void {
  // ============================================================================
  // OSC Communication Handler
  // ============================================================================
  /**
   * Generic OSC send handler
   * Forwards OSC messages from renderer to the OSC client
   */
  ipcMain.handle('osc:send', async (_, address: string, args: unknown[]) => {
    oscClient.send(address, args as Array<number | string | boolean>)
  })

  // ============================================================================
  // Max Device Export Handlers
  // ============================================================================
  ipcMain.handle('max-device:export', async () => {
    return await exportMaxDevice()
  })

  ipcMain.handle('max-device:quick-install', async () => {
    return await quickInstallMaxDevice()
  })

  ipcMain.handle('max-device:check-exists', async () => {
    return await checkMaxDeviceExists()
  })

  // ============================================================================
  // Configuration File Handlers
  // ============================================================================

  ipcMain.handle('config:save', async (_, content: string, path: string) => {
    try {
      await fs.writeFile(path, content, 'utf-8')
      return { success: true, path }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save configuration'
      }
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
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to open file'
      }
    }
  })

  ipcMain.handle('config:saveAs', async (_, content: string) => {
    try {
      const result = await dialog.showSaveDialog(mainWindowRef!, {
        title: 'Save Configuration File',
        defaultPath: 'new-config.yaml',
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
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save file'
      }
    }
  })

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

  ipcMain.handle('hydra:open', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindowRef!, {
        title: 'Open Hydra Shader File',
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
        defaultPath: 'new-shader.js',
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
  // Camera WebSocket Streaming Handlers
  // ============================================================================
  ipcMain.handle('camera:start', async (_, wsPort: number = 8765): Promise<StartServerResult> => {
    try {
      const httpPort = wsPort + 1 // HTTP server on WS port + 1
      await cameraServer.start(wsPort, httpPort)
      const localIP = getLocalIPAddress()
      return { success: true, ip: localIP, httpPort, wsPort }
    } catch (error) {
      return {
        success: false,
        ip: '',
        httpPort: wsPort + 1,
        wsPort,
        error: error instanceof Error ? error.message : 'Failed to start camera server'
      }
    }
  })

  ipcMain.handle('camera:stop', async (): Promise<StopServerResult> => {
    try {
      cameraServer.stop()
      return { success: true }
    } catch (error) {
      return { success: false }
    }
  })

  ipcMain.handle('camera:get-status', async () => {
    const status = cameraServer.getStatus()
    status.ip = getLocalIPAddress()
    return status
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
