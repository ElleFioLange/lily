import { WebSocketServer, WebSocket } from 'ws'
import { EventEmitter } from 'events'
import { createServer as createHTTPSServer, Server as HTTPSServer } from 'https'
import { IncomingMessage, ServerResponse } from 'http'
import { readFile } from 'fs/promises'
import { join } from 'path'
import selfsigned from 'selfsigned'
import type { CameraServerStatus } from '../../types/camera'

/**
 * Generate a self-signed certificate for HTTPS
 * Required for iOS Safari to access camera via getUserMedia
 */
async function generateSelfSignedCert(): Promise<{ key: string; cert: string }> {
  const attrs = [{ name: 'commonName', value: 'localhost' }]
  const options = {
    keySize: 2048
  }
  const pems = await selfsigned.generate(attrs, options)

  return {
    key: pems.private,
    cert: pems.cert
  }
}

/**
 * WebSocket server for receiving camera streams from mobile devices
 * Includes HTTPS server to serve the camera client HTML page (required for iOS)
 * Emits 'frame' events when JPEG frames are received
 * Emits 'clientConnected' and 'clientDisconnected' events for connection tracking
 */
export class CameraWebSocketServer extends EventEmitter {
  private httpServer: HTTPSServer | null = null
  private wss: WebSocketServer | null = null
  private clients: Set<WebSocket> = new Set()
  private httpPort: number = 8766
  private wsPort: number = 8765
  private isRunning: boolean = false

  /**
   * Start both HTTPS and WebSocket servers
   * HTTPS server serves the camera client HTML on port 8766 (required for iOS)
   * WebSocket server receives camera frames on port 8765
   * @param wsPort - WebSocket port (default: 8765)
   * @param httpPort - HTTPS port (default: 8766)
   */
  async start(wsPort: number = 8765, httpPort: number = 8766): Promise<void> {
    if (this.isRunning) {
      console.warn('Camera server is already running')
      return
    }

    this.wsPort = wsPort
    this.httpPort = httpPort

    try {
      // Generate self-signed certificate for HTTPS (required for iOS camera access)
      const { key, cert } = await generateSelfSignedCert()

      // Request handler for both HTTP and HTTPS
      const requestHandler = async (req: IncomingMessage, res: ServerResponse) => {
        if (req.url === '/' || req.url === '/index.html') {
          try {
            // Serve the camera client HTML file
            const htmlPath = join(__dirname, '../../resources/camera-client.html')
            const html = await readFile(htmlPath, 'utf-8')

            // Inject WebSocket URL into the HTML (use wss:// for secure WebSocket)
            const modifiedHtml = html.replace(
              'value="ws://192.168.1.100:8765"',
              `value="wss://${req.headers.host?.split(':')[0] || 'localhost'}:${this.httpPort}"`
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
      }

      // Create HTTPS server
      this.httpServer = createHTTPSServer({ key, cert }, requestHandler)

      // Start HTTPS server
      this.httpServer.listen(this.httpPort, () => {
        console.log(`Camera HTTPS server listening on port ${this.httpPort}`)
        console.log(`⚠️  Note: You may need to accept the self-signed certificate in your browser`)
      })

      // Create secure WebSocket server (WSS) on the same HTTPS server
      this.wss = new WebSocketServer({ server: this.httpServer })

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
