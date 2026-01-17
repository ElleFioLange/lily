import { useEffect } from 'react'
import Layout from './components/Layout'
import { PerformanceWindow } from './windows/performance/PerformanceWindow'
import { setupOSCListeners } from './stores/useOSCStore'
// import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { setupCameraListeners } from './stores/useCameraStore'
import { usePerformanceStore } from './stores/usePerformanceStore'
import { useGraphicsStore } from './stores/useGraphicsStore'
import { Compositor } from './graphics/Compositor'
import PoiesisPlugin from './surfaces/poiesis'
import ConfigPlugin from './surfaces/config'
import { usePluginsStore } from './stores/usePluginsStore'

function App(): React.JSX.Element {
  const togglePerformanceWindow = usePerformanceStore((state) => state.toggleWindow)
  const { setCompositorRef } = useGraphicsStore()
  const { registerPlugin } = usePluginsStore()

  // Initialize keyboard shortcuts
  // useKeyboardShortcuts()

  useEffect(() => {
    // Initialize the compositor
    const compositor = new Compositor()
    setCompositorRef(compositor)

    // Register system plug-ins (poiesis and config)
    registerPlugin(PoiesisPlugin)
    registerPlugin(ConfigPlugin)

    // Register installed plugins (load dynamically)

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
