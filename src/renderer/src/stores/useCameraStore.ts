import { create } from 'zustand'
import type { CameraServerStatus } from '../../../types/camera'

interface CameraStoreInterface {
  // Server state
  isServerRunning: boolean
  serverPort: number
  serverIP: string
  clientCount: number

  // Frame state
  latestFrameURL: string | null
  frameCount: number

  // Actions
  startServer: (port?: number) => Promise<void>
  stopServer: () => Promise<void>
  updateStatus: (status: CameraServerStatus) => void
  updateFrame: (buffer: ArrayBuffer) => void
  setClientCount: (count: number) => void
}

export const useCameraStore = create<CameraStoreInterface>((set, get) => ({
  // Initial state
  isServerRunning: false,
  serverPort: 8765,
  serverIP: '',
  clientCount: 0,
  latestFrameURL: null,
  frameCount: 0,

  // Start WebSocket server
  startServer: async (port = 8765) => {
    try {
      const result = await window.api.camera.start(port)
      if (result.success) {
        set({
          isServerRunning: true,
          serverIP: result.ip,
          serverPort: result.port
        })
        console.log(`Camera server started on ${result.ip}:${result.port}`)
      } else {
        console.error('Failed to start camera server:', result.error)
      }
    } catch (error) {
      console.error('Error starting camera server:', error)
    }
  },

  // Stop WebSocket server
  stopServer: async () => {
    try {
      const result = await window.api.camera.stop()
      if (result.success) {
        // Revoke blob URL to prevent memory leak
        const currentURL = get().latestFrameURL
        if (currentURL) {
          URL.revokeObjectURL(currentURL)
        }

        set({
          isServerRunning: false,
          clientCount: 0,
          latestFrameURL: null,
          frameCount: 0
        })
        console.log('Camera server stopped')
      }
    } catch (error) {
      console.error('Error stopping camera server:', error)
    }
  },

  // Update server status
  updateStatus: (status: CameraServerStatus) => {
    set({
      isServerRunning: status.isRunning,
      serverPort: status.port,
      serverIP: status.ip,
      clientCount: status.clientCount
    })
  },

  // Update frame data and create blob URL
  updateFrame: (buffer: ArrayBuffer) => {
    const blob = new Blob([buffer], { type: 'image/jpeg' })
    const url = URL.createObjectURL(blob)

    // Revoke old URL to prevent memory leak
    const oldURL = get().latestFrameURL
    if (oldURL) {
      URL.revokeObjectURL(oldURL)
    }

    set({
      latestFrameURL: url,
      frameCount: get().frameCount + 1
    })
  },

  // Update client count
  setClientCount: (count: number) => {
    set({ clientCount: count })
  }
}))

/**
 * Setup camera event listeners
 * Call this from App.tsx on mount to wire incoming frames to the store
 */
export function setupCameraListeners(): void {
  const store = useCameraStore.getState()

  // Listen for incoming frames
  window.api.camera.onFrame((buffer) => {
    store.updateFrame(buffer)
  })

  // Listen for client connections
  window.api.camera.onClientConnected((count) => {
    store.setClientCount(count)
    console.log(`Camera client connected. Total clients: ${count}`)
  })

  // Listen for client disconnections
  window.api.camera.onClientDisconnected((count) => {
    store.setClientCount(count)
    console.log(`Camera client disconnected. Total clients: ${count}`)
  })

  console.log('Camera listeners setup complete')
}
