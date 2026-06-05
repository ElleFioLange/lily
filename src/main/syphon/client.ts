import { EventEmitter } from 'events'

// node-syphon types (no official @types package)
interface SyphonServerDescription {
  SyphonServerDescriptionNameKey: string
  SyphonServerDescriptionAppNameKey: string
  SyphonServerDescriptionUUIDKey: string
  [key: string]: unknown
}

interface FrameDataDefinition {
  buffer: Buffer
  width: number
  height: number
}

interface ISyphonOpenGLClient extends EventEmitter {
  on(event: 'frame', callback: (frame: FrameDataDefinition) => void): this
  stop(): void
}

interface ISyphonServerDirectory extends EventEmitter {
  servers: SyphonServerDescription[]
  listen(): void
  stop(): void
}

export interface SyphonServerInfo {
  name: string
  appName: string
  uuid: string
  raw: SyphonServerDescription
}

export interface SyphonFrameEvent {
  instanceId: string
  buffer: Buffer
  width: number
  height: number
}

class SyphonManager extends EventEmitter {
  private directory: ISyphonServerDirectory | null = null
  private clients = new Map<string, ISyphonOpenGLClient>()
  private available = false

  init(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const syphon = require('node-syphon')
      const { SyphonOpenGLClient, SyphonServerDirectory, SyphonServerDirectoryListenerChannel } =
        syphon

      this.directory = new SyphonServerDirectory() as ISyphonServerDirectory

      const onServersChanged = () => {
        this.emit('servers-changed', this.getServers())
      }

      this.directory.on(
        SyphonServerDirectoryListenerChannel.SyphonServerAnnounceNotification,
        onServersChanged
      )
      this.directory.on(
        SyphonServerDirectoryListenerChannel.SyphonServerRetireNotification,
        onServersChanged
      )

      this.directory.listen()
      this.available = true

      // Store constructor for use in connect()
      this._SyphonOpenGLClient = SyphonOpenGLClient

      console.log('[Syphon] initialized')
    } catch (err) {
      console.warn('[Syphon] node-syphon not available (macOS only):', err)
      this.available = false
    }
  }

  private _SyphonOpenGLClient:
    | (new (server: SyphonServerDescription) => ISyphonOpenGLClient)
    | null = null

  getServers(): SyphonServerInfo[] {
    if (!this.directory || !this.available) return []
    try {
      return this.directory.servers.map((s) => ({
        name: s.SyphonServerDescriptionNameKey ?? '',
        appName: s.SyphonServerDescriptionAppNameKey ?? '',
        uuid: s.SyphonServerDescriptionUUIDKey ?? '',
        raw: s
      }))
    } catch {
      return []
    }
  }

  connect(instanceId: string, serverUUID: string): boolean {
    if (!this.available || !this._SyphonOpenGLClient || !this.directory) return false

    const server = this.directory.servers.find(
      (s) => s.SyphonServerDescriptionUUIDKey === serverUUID
    )
    if (!server) {
      console.warn(`[Syphon] server ${serverUUID} not found`)
      return false
    }

    try {
      this.disconnect(instanceId)

      const client = new this._SyphonOpenGLClient(server)
      client.on('frame', (frame: FrameDataDefinition) => {
        this.emit('frame', {
          instanceId,
          buffer: frame.buffer,
          width: frame.width,
          height: frame.height
        } satisfies SyphonFrameEvent)
      })

      this.clients.set(instanceId, client)
      console.log(`[Syphon] instance ${instanceId} connected to ${serverUUID}`)
      return true
    } catch (err) {
      console.error('[Syphon] failed to connect client:', err)
      return false
    }
  }

  disconnect(instanceId: string): void {
    const client = this.clients.get(instanceId)
    if (client) {
      try {
        client.stop()
      } catch {}
      this.clients.delete(instanceId)
      console.log(`[Syphon] instance ${instanceId} disconnected`)
    }
  }

  isConnected(instanceId: string): boolean {
    return this.clients.has(instanceId)
  }

  cleanup(): void {
    for (const instanceId of [...this.clients.keys()]) {
      this.disconnect(instanceId)
    }
    try {
      this.directory?.stop()
    } catch {}
    this.directory = null
    this.available = false
  }
}

let instance: SyphonManager | null = null

export function getSyphonManager(): SyphonManager {
  if (!instance) {
    instance = new SyphonManager()
  }
  return instance
}
