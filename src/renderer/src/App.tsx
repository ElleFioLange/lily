import { useEffect } from 'react'
import Layout from './components/Layout'
import { setupOSCListeners } from './stores/useOSCStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useInputStore } from './stores/useInputStore'
import { setupCameraListeners } from './stores/useCameraStore'
import { useHydraStore } from './stores/useHydraStore'

function App(): React.JSX.Element {
  const input = useInputStore((state) => state.input)

  // Initialize keyboard shortcuts
  useKeyboardShortcuts()

  useEffect(() => {
    // Setup OSC event listeners when component mounts
    setupOSCListeners()

    // Setup camera streaming listeners
    setupCameraListeners()

    // Initialize configuration store
    // initializeConfigStore()

    // Setup Hydra shader request handler for popup window
    window.api.hydra.onRequestShader(() => {
      const { shader } = useHydraStore.getState()
      window.api.hydra.sendShaderResponse(shader)
    })

    window.api.osc.send('/request/connection/confirm')
  }, [])

  // Send text updates to Hydra popup window
  useEffect(() => {
    window.api.hydra.sendTextUpdate(input)
  }, [input])

  return <Layout />
}

export default App
