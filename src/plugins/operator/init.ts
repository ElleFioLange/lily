import { createOperatorStore } from './store'
import { createControlClient } from './ws'
import { useGraphicsStore } from '@renderer/stores/useGraphicsStore'

/** True for the Syphon source Operator's window publisher advertises. */
function isOperatorServer(server: { name: string; appName: string }): boolean {
  return (
    server.name.toLowerCase().includes('operator') ||
    server.appName.toLowerCase().includes('operator')
  )
}

export default function init(instanceId: string) {
  const useStore = createOperatorStore(instanceId)

  const canvas = document.createElement('canvas')
  canvas.width = 1920
  canvas.height = 1080
  canvas.getContext('2d')

  useStore.getState().setCanvas(canvas)

  const { addGraphicsSource } = useGraphicsStore.getState()
  addGraphicsSource({ id: instanceId, canvas })

  const handleFrame = (
    _: unknown,
    payload: { instanceId: string; buffer: ArrayBuffer; width: number; height: number }
  ) => {
    if (payload.instanceId !== instanceId) return

    const store = useStore.getState()
    const ctx = store.canvas?.getContext('2d')
    if (!ctx || !store.canvas) return

    const { buffer, width, height } = payload

    // Follow the incoming frame size so Operator window resizes track 1:1
    if (store.canvas.width !== width || store.canvas.height !== height) {
      store.canvas.width = width
      store.canvas.height = height
      store.setFrameDimensions(width, height)
    }

    const imageData = new ImageData(new Uint8ClampedArray(buffer), width, height)
    ctx.putImageData(imageData, 0, 0)
    store.incrementFrameCount()
  }

  window.api.syphon.onFrame(handleFrame)

  // Auto-connect to the Operator Syphon server as soon as it appears
  const tryAutoConnect = async (servers: { name: string; appName: string; uuid: string }[]) => {
    useStore.getState().setServers(servers)
    if (useStore.getState().connectedServerUUID) return
    const operatorServer = servers.find(isOperatorServer)
    if (!operatorServer) return
    const result = await window.api.syphon.connect(instanceId, operatorServer.uuid)
    if (result.success) {
      useStore.getState().setConnectedServer(operatorServer.uuid)
      console.log('[Operator] connected to Syphon server:', operatorServer.name)
    }
  }

  window.api.syphon.listServers().then(tryAutoConnect)
  window.api.syphon.onServersChanged((servers) => void tryAutoConnect(servers))

  // Control channel: connect right away when a token is already configured;
  // otherwise the Workspace UI connects after the user enters one
  const client = createControlClient(instanceId, useStore)
  if (useStore.getState().settings.token) {
    client.connect()
  }

  console.log('[Operator] plugin initialized:', instanceId)
  return useStore
}
