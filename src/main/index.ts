import { app, shell, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getOSCServer } from './osc/server'
import { getOSCClient } from './osc/client'
import { exportMaxDevice, quickInstallMaxDevice, checkMaxDeviceExists } from './maxdevice/export'

// Initialize OSC server and client
const oscServer = getOSCServer({ port: 5460 })
const oscClient = getOSCClient({ port: 5459 })

let mainWindowRef: BrowserWindow | null = null

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

    // Forward OSC events to renderer
    oscServer.on('message', (packet) => {
      mainWindowRef?.webContents.send('osc:message', packet)
    })

    oscServer.on('transport:state', (packet) => {
      mainWindowRef?.webContents.send('osc:transport:state', packet)
    })

    oscServer.on('track:update', (data) => {
      mainWindowRef?.webContents.send('osc:track:update', data)
    })

    oscServer.on('init:complete', (version) => {
      mainWindowRef?.webContents.send('osc:init:complete', version)
      mainWindowRef?.webContents.send('osc:connection', true)
    })

    oscServer.on('ready', () => {
      mainWindowRef?.webContents.send('osc:connection', true)
    })

    oscServer.on('error', () => {
      mainWindowRef?.webContents.send('osc:connection', false)
    })

    oscServer.on('stopped', () => {
      mainWindowRef?.webContents.send('osc:connection', false)
    })
  } catch (err) {
    console.error('Failed to initialize OSC:', err)
  }
}

// Setup IPC handlers
function setupIPCHandlers(): void {
  // OSC send handlers
  ipcMain.handle('osc:send', async (_, address: string, args: unknown[]) => {
    oscClient.send(address, args as Array<number | string | boolean>)
  })

  // Transport controls
  ipcMain.handle('osc:transport:play', async () => {
    oscClient.transportPlay()
  })

  ipcMain.handle('osc:transport:stop', async () => {
    oscClient.transportStop()
  })

  ipcMain.handle('osc:transport:tempo', async (_, bpm: number) => {
    oscClient.transportSetTempo(bpm)
  })

  // Track controls
  ipcMain.handle('osc:track:volume', async (_, trackIndex: number, volume: number) => {
    oscClient.trackSetVolume(trackIndex, volume)
  })

  ipcMain.handle('osc:track:pan', async (_, trackIndex: number, pan: number) => {
    oscClient.trackSetPan(trackIndex, pan)
  })

  ipcMain.handle('osc:track:mute', async (_, trackIndex: number, mute: boolean) => {
    oscClient.trackSetMute(trackIndex, mute)
  })

  ipcMain.handle('osc:track:solo', async (_, trackIndex: number, solo: boolean) => {
    oscClient.trackSetSolo(trackIndex, solo)
  })

  // Scene controls
  ipcMain.handle('osc:scene:fire', async (_, sceneIndex: number) => {
    oscClient.sceneFire(sceneIndex)
  })

  // Initialization
  ipcMain.handle('osc:init:request', async () => {
    oscClient.requestInit()
  })

  // Max device export handlers
  ipcMain.handle('max-device:export', async () => {
    return await exportMaxDevice()
  })

  ipcMain.handle('max-device:quick-install', async () => {
    return await quickInstallMaxDevice()
  })

  ipcMain.handle('max-device:check-exists', async () => {
    return await checkMaxDeviceExists()
  })

  // Layout switching
  ipcMain.handle('layout:set', async (_, layout: 'performance' | 'ableton-configuration') => {
    mainWindowRef?.webContents.send('layout:change', layout)
  })
}
