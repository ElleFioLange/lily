import { WebSocketServer, WebSocket } from 'ws'
import { EventEmitter } from 'events'
import type { CameraServerStatus } from '../../types/camera'

/**
 * WebSocket server for receiving camera streams from mobile devices
 * Emits 'frame' events when JPEG frames are received
 * Emits 'clientConnected' and 'clientDisconnected' events for connection tracking
 */
export class CameraWebSocketServer extends EventEmitter {
  private wss: WebSocketServer | null = null
  private clients: Set<WebSocket> = new Set()
  private port: number = 8765
  private isRunning: boolean = false

  /**
   * Start the WebSocket server on the specified port
   * @param port - Port number to listen on (default: 8765)
   */
  start(port: number = 8765): void {
    if (this.isRunning) {
      console.warn('Camera WebSocket server is already running')
      return
    }

    this.port = port

    try {
      this.wss = new WebSocketServer({ port: this.port })

      this.wss.on('listening', () => {
        console.log(`Camera WebSocket server listening on port ${this.port}`)
        this.isRunning = true
        this.emit('serverStarted', { port: this.port })
      })

      this.wss.on('connection', (ws: WebSocket) => {
        console.log('Camera client connected')
        this.clients.add(ws)
        this.emit('clientConnected', { clientCount: this.clients.size })

        // Handle incoming binary frames
        ws.on('message', (data: Buffer) => {
          // Emit frame event with binary JPEG data
          this.emit('frame', data)
        })

        // Handle client disconnection
        ws.on('close', () => {
          console.log('Camera client disconnected')
          this.clients.delete(ws)
          this.emit('clientDisconnected', { clientCount: this.clients.size })
        })

        // Handle errors
        ws.on('error', (error) => {
          console.error('Camera client error:', error)
          this.clients.delete(ws)
        })
      })

      this.wss.on('error', (error) => {
        console.error('Camera WebSocket server error:', error)
        this.emit('error', error)
      })
    } catch (error) {
      console.error('Failed to start camera WebSocket server:', error)
      this.isRunning = false
      throw error
    }
  }

  /**
   * Stop the WebSocket server and close all client connections
   */
  stop(): void {
    if (!this.isRunning || !this.wss) {
      console.warn('Camera WebSocket server is not running')
      return
    }

    // Close all client connections
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close()
      }
    })
    this.clients.clear()

    // Close the server
    this.wss.close(() => {
      console.log('Camera WebSocket server stopped')
      this.isRunning = false
      this.emit('serverStopped')
    })

    this.wss = null
  }

  /**
   * Get the current server status
   */
  getStatus(): CameraServerStatus {
    return {
      isRunning: this.isRunning,
      port: this.port,
      ip: '', // Will be filled by main process with actual local IP
      clientCount: this.clients.size
    }
  }

  /**
   * Get the number of connected clients
   */
  getClientCount(): number {
    return this.clients.size
  }
}

// Singleton instance
let cameraServerInstance: CameraWebSocketServer | null = null

/**
 * Get the singleton instance of the camera WebSocket server
 */
export function getCameraWebSocketServer(): CameraWebSocketServer {
  if (!cameraServerInstance) {
    cameraServerInstance = new CameraWebSocketServer()
  }
  return cameraServerInstance
}
