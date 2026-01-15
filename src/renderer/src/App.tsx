import { useEffect } from 'react'
import Layout from './components/Layout'
import { PerformanceWindow } from './windows/performance/PerformanceWindow'
import { setupOSCListeners } from './stores/useOSCStore'
// import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { setupCameraListeners } from './stores/useCameraStore'
import { usePerformanceStore } from './stores/usePerformanceStore'
import HydraPlugin from '@plugins/hydra'
import { useGraphicsStore } from './stores/useGraphicsStore'
import { Compositor } from './graphics/Compositor'

function App(): React.JSX.Element {
  const togglePerformanceWindow = usePerformanceStore((state) => state.toggleWindow)
  const { setCompositorRef } = useGraphicsStore()

  // Initialize keyboard shortcuts
  // useKeyboardShortcuts()

  useEffect(() => {
    const compositor = new Compositor()
    setCompositorRef(compositor)

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

    return () => {
      unsubscribe()
      setCompositorRef(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [togglePerformanceWindow])

  return (
    <>
      <Layout />
      <PerformanceWindow />
    </>
  )
}

export default App
