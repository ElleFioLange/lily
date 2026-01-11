import { useEffect } from 'react'
import Layout from './components/Layout'
import { PerformanceWindow } from './components/PerformanceWindow'
import { setupOSCListeners } from './stores/useOSCStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { setupCameraListeners } from './stores/useCameraStore'
import { usePerformanceStore } from './stores/usePerformanceStore'
import HydraPlugin from '@plugins/hydra'
import { initCompositor } from './lib/Compositor'

function App(): React.JSX.Element {
  const togglePerformanceWindow = usePerformanceStore((state) => state.toggleWindow)

  // Initialize keyboard shortcuts
  useKeyboardShortcuts()

  useEffect(() => {
    initCompositor()

    HydraPlugin.init()

    // Setup OSC event listeners when component mounts
    setupOSCListeners()

    // Setup camera streaming listeners
    setupCameraListeners()

    // Listen for performance window toggle from menu
    const unsubscribe = window.api.performance.onToggle(() => {
      togglePerformanceWindow()
    })

    window.api.osc.send('/request/connection/confirm')

    return unsubscribe
  }, [togglePerformanceWindow])

  return (
    <>
      <Layout />
      <PerformanceWindow />
    </>
  )
}

export default App
