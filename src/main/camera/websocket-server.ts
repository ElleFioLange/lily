import { WebSocketServer, WebSocket } from 'ws'
import { EventEmitter } from 'events'
import { createServer, Server as HTTPServer } from 'http'
import { readFile } from 'fs/promises'
import { join } from 'path'
import type { CameraServerStatus } from '../../types/camera'

/**
 * WebSocket server for receiving camera streams from mobile devices
 * Includes HTTP server to serve the camera client HTML page
 * Emits 'frame' events when JPEG frames are received
 * Emits 'clientConnected' and 'clientDisconnected' events for connection tracking
 */
export class CameraWebSocketServer extends EventEmitter {
  private httpServer: HTTPServer | null = null
  private wss: WebSocketServer | null = null
  private clients: Set<WebSocket> = new Set()
  private httpPort: number = 8766
  private wsPort: number = 8765
  private isRunning: boolean = false

  /**
   * Start both HTTP and WebSocket servers
   * HTTP server serves the camera client HTML on port 8766
   * WebSocket server receives camera frames on port 8765
   * @param wsPort - WebSocket port (default: 8765)
   * @param httpPort - HTTP port (default: 8766)
   */
  start(wsPort: number = 8765, httpPort: number = 8766): void {
    if (this.isRunning) {
      console.warn('Camera server is already running')
      return
    }

    this.wsPort = wsPort
    this.httpPort = httpPort

    try {
      // Create HTTP server to serve camera client HTML
      this.httpServer = createServer(async (req, res) => {
        if (req.url === '/' || req.url === '/index.html') {
          try {
            // Serve the camera client HTML file
            const htmlPath = join(__dirname, '../../resources/camera-client.html')
            const html = await readFile(htmlPath, 'utf-8')

            // Inject WebSocket port into the HTML
            const modifiedHtml = html.replace(
              'value="ws://192.168.1.100:8765"',
              `value="ws://${req.headers.host?.split(':')[0] || 'localhost'}:${this.wsPort}"`
            )

            res.writeHead(200, { 'Content-Type': 'text/html' })
            res.end(modifiedHtml)
          } catch (error) {
            console.error('Error serving camera client:', error)
            res.writeHead(500, { 'Content-Type': 'text/plain' })
            res.end('Error loading camera client')
          }
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' })
          res.end('Not found')
        }
      })

      // Start HTTP server
      this.httpServer.listen(this.httpPort, () => {
        console.log(`Camera HTTP server listening on port ${this.httpPort}`)
      })

      // Create WebSocket server
      this.wss = new WebSocketServer({ port: this.wsPort })

      this.wss.on('listening', () => {
        console.log(`Camera WebSocket server listening on port ${this.wsPort}`)
        this.isRunning = true
        this.emit('serverStarted', { wsPort: this.wsPort, httpPort: this.httpPort })
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
      console.error('Failed to start camera servers:', error)
      this.isRunning = false
      throw error
    }
  }

  /**
   * Stop both HTTP and WebSocket servers and close all client connections
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('Camera server is not running')
      return
    }

    // Close all client connections
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close()
      }
    })
    this.clients.clear()

    // Close WebSocket server
    if (this.wss) {
      this.wss.close(() => {
        console.log('Camera WebSocket server stopped')
      })
      this.wss = null
    }

    // Close HTTP server
    if (this.httpServer) {
      this.httpServer.close(() => {
        console.log('Camera HTTP server stopped')
      })
      this.httpServer = null
    }

    this.isRunning = false
    this.emit('serverStopped')
  }

  /**
   * Get the current server status
   */
  getStatus(): CameraServerStatus {
    return {
      isRunning: this.isRunning,
      httpPort: this.httpPort,
      wsPort: this.wsPort,
      ip: '', // Will be filled by main process with actual local IP
      clientCount: this.clients.size
    }
  }

  /**
   * Get the HTTP port
   */
  getHttpPort(): number {
    return this.httpPort
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
