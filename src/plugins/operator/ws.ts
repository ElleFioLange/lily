import { UseStore } from 'src/types/plugins'
import { OperatorState } from './store'

// Operator's control protocol (see Operator's wsControlServer):
//  → {type:'auth', token}            first message on every connection
//  ← {type:'authOk'}                 or close(4401) on a bad token
//  → {type:'setVar', name, value}    value is JSON data, never code
//  ← {type:'ack', name, ok, error?}  once Operator applied (or rejected) it

const RECONNECT_DELAY_MS = 2000

export class OperatorControlClient {
  private socket: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  // True between connect() and disconnect(); drives auto-reconnect on drop
  private enabled = false
  private authed = false

  constructor(private readonly useStore: UseStore<OperatorState>) {}

  get isConnected(): boolean {
    return this.authed && this.socket?.readyState === WebSocket.OPEN
  }

  connect(): void {
    this.enabled = true
    this.open()
  }

  disconnect(): void {
    this.enabled = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.socket?.close()
    this.socket = null
    this.authed = false
    this.useStore.getState().setControlStatus('disconnected')
  }

  setVar(name: string, value: unknown): boolean {
    if (!this.isConnected || !this.socket) return false
    this.socket.send(JSON.stringify({ type: 'setVar', name, value }))
    return true
  }

  private open(): void {
    const store = this.useStore.getState()
    const { host, port, token } = store.settings
    store.setControlStatus('connecting')

    let socket: WebSocket
    try {
      socket = new WebSocket(`ws://${host}:${port}`)
    } catch (err) {
      store.setControlStatus('error', err instanceof Error ? err.message : String(err))
      this.scheduleReconnect()
      return
    }
    this.socket = socket
    this.authed = false

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'auth', token }))
    }

    socket.onmessage = (event) => {
      let message: { type?: string; ok?: boolean; name?: string; error?: string }
      try {
        message = JSON.parse(String(event.data))
      } catch {
        return
      }
      const state = this.useStore.getState()
      if (message.type === 'authOk') {
        this.authed = true
        state.setControlStatus('connected')
      } else if (message.type === 'ack') {
        state.setLastAck(
          message.ok ? `${message.name} ✓` : `${message.name} ✗ ${message.error ?? ''}`
        )
        if (!message.ok) console.warn('[Operator] setVar rejected:', message.name, message.error)
      }
    }

    socket.onclose = (event) => {
      if (this.socket !== socket) return
      this.socket = null
      const wasAuthed = this.authed
      this.authed = false
      const state = this.useStore.getState()
      if (!this.enabled) return
      // 4401 = Operator rejected the token; retrying would loop on the same
      // failure, so surface it and wait for the user to fix the token
      if (event.code === 4401) {
        this.enabled = false
        state.setControlStatus('error', 'Operator rejected the token')
        return
      }
      state.setControlStatus(
        'connecting',
        wasAuthed ? 'Connection lost — reconnecting' : 'Operator unreachable — retrying'
      )
      this.scheduleReconnect()
    }

    socket.onerror = () => {
      // onclose follows and owns the retry; nothing to do here
    }
  }

  private scheduleReconnect(): void {
    if (!this.enabled || this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.enabled) this.open()
    }, RECONNECT_DELAY_MS)
  }
}

// Client per plugin instance, reachable from process()/cleanup()/UI without
// storing class instances in zustand state
const clients = new Map<string, OperatorControlClient>()

export function createControlClient(
  instanceId: string,
  useStore: UseStore<OperatorState>
): OperatorControlClient {
  const client = new OperatorControlClient(useStore)
  clients.set(instanceId, client)
  return client
}

export function getControlClient(instanceId: string): OperatorControlClient | undefined {
  return clients.get(instanceId)
}

export function destroyControlClient(instanceId: string): void {
  clients.get(instanceId)?.disconnect()
  clients.delete(instanceId)
}
