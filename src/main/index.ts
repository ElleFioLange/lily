import { app, shell, BrowserWindow, ipcMain, Menu, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getOSCServer } from './osc/server'
import { getOSCClient } from './osc/client'
import { exportMaxDevice, quickInstallMaxDevice, checkMaxDeviceExists } from './maxdevice/export'
import { promises as fs } from 'fs'

// Initialize OSC server and client
const oscServer = getOSCServer({ port: 5460 })
const oscClient = getOSCClient({ port: 5459 })

let mainWindowRef: BrowserWindow | null = null
let hydraPopupWindowRef: BrowserWindow | null = null

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
              { role: 'selectAll' as const }
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
        { type: 'separator' as const },
        // Layout switching options
        {
          label: 'Layout',
          submenu: [
            {
              label: 'Performance',
              type: 'radio',
              checked: true,
              click: () => {
                mainWindowRef?.webContents.send('layout:change', 'performance')
              }
            },
            {
              label: 'Ableton Configuration',
              type: 'radio',
              click: () => {
                mainWindowRef?.webContents.send('layout:change', 'ableton-configuration')
              }
            },
            {
              label: 'Hydra Configuration',
              type: 'radio',
              click: () => {
                mainWindowRef?.webContents.send('layout:change', 'hydra-configuration')
              }
            }
          ]
        }
      ]
    },

    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
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
    mainWindow.show()
  })

  // Store reference for OSC event forwarding
  mainWindowRef = mainWindow

  // Create application menu
  createMenu()

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
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

function createHydraPopup(): void {
  // Don't create duplicate windows
  if (hydraPopupWindowRef && !hydraPopupWindowRef.isDestroyed()) {
    hydraPopupWindowRef.focus()
    return
  }

  const popupWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'Hydra Output',
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  hydraPopupWindowRef = popupWindow

  // Load popup HTML
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    popupWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/hydra-popup.html`)
  } else {
    popupWindow.loadFile(join(__dirname, '../renderer/hydra-popup.html'))
  }

  // Cleanup on close
  popupWindow.on('closed', () => {
    hydraPopupWindowRef = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
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

  // Initialize OSC communication
  initializeOSC()

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
  // Layout Switching Handler
  // ============================================================================
  ipcMain.handle('layout:set', async (_, layout: 'performance' | 'ableton-configuration') => {
    mainWindowRef?.webContents.send('layout:change', layout)
  })

  // ============================================================================
  // Configuration File Handlers
  // ============================================================================
  const getConfigPath = () => join(app.getPath('userData'), 'lily.config.yaml')

  ipcMain.handle('config:getPath', async () => {
    return getConfigPath()
  })

  ipcMain.handle('config:load', async () => {
    const configPath = getConfigPath()
    try {
      const content = await fs.readFile(configPath, 'utf-8')
      return { success: true, content, path: configPath }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return { success: false, error: 'Configuration file not found' }
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to load configuration'
      }
    }
  })

  ipcMain.handle('config:save', async (_, content: string) => {
    const configPath = getConfigPath()
    try {
      await fs.writeFile(configPath, content, 'utf-8')
      return { success: true, path: configPath }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save configuration'
      }
    }
  })

  ipcMain.handle('config:openFile', async () => {
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

  ipcMain.handle('config:saveFileAs', async (_, content: string) => {
    try {
      const result = await dialog.showSaveDialog(mainWindowRef!, {
        title: 'Save Configuration File',
        defaultPath: 'lily.config.yaml',
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
  // Hydra Popup Window Handlers
  // ============================================================================
  ipcMain.handle('hydra:open-popup', async () => {
    createHydraPopup()
    return { success: true }
  })

  ipcMain.handle('hydra:evaluate', async (_, code: string) => {
    // Forward to popup window if open
    if (hydraPopupWindowRef && !hydraPopupWindowRef.isDestroyed()) {
      hydraPopupWindowRef.webContents.send('hydra:evaluate-shader', code)
    }
    return { success: true }
  })

  // Handle shader request from popup window
  ipcMain.on('hydra:request-shader', () => {
    mainWindowRef?.webContents.send('hydra:request-shader')
  })

  // Handle shader response from main window
  ipcMain.on('hydra:shader-response', (_, code: string) => {
    if (hydraPopupWindowRef && !hydraPopupWindowRef.isDestroyed()) {
      hydraPopupWindowRef.webContents.send('hydra:evaluate-shader', code)
    }
  })

  // Handle text update from main window
  ipcMain.on('hydra:text-update', (_, text: string) => {
    if (hydraPopupWindowRef && !hydraPopupWindowRef.isDestroyed()) {
      hydraPopupWindowRef.webContents.send('hydra:text-update', text)
    }
  })

  // Handle scroll position update from main window
  ipcMain.on('hydra:scroll-update', (_, scrollPercentage: number) => {
    if (hydraPopupWindowRef && !hydraPopupWindowRef.isDestroyed()) {
      hydraPopupWindowRef.webContents.send('hydra:scroll-update', scrollPercentage)
    }
  })
}
