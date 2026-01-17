import { useEffect, useState } from 'react'
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
import { loadPlugins } from './utils/loadPlugins'

function App(): React.JSX.Element {
  const togglePerformanceWindow = usePerformanceStore((state) => state.toggleWindow)
  const { setCompositorRef } = useGraphicsStore()
  const { registerPlugin } = usePluginsStore()
  const [pluginsLoaded, setPluginsLoaded] = useState(false)

  // Initialize keyboard shortcuts
  // useKeyboardShortcuts()

  useEffect(() => {
    // Initialize the compositor
    const compositor = new Compositor()
    setCompositorRef(compositor)

    // Register system plug-ins (poiesis and config)
    registerPlugin(PoiesisPlugin)
    registerPlugin(ConfigPlugin)

    // Dynamically load and register plugins from src/plugins/
    loadPlugins()
      .then((plugins) => {
        plugins.forEach(registerPlugin)
        setPluginsLoaded(true)
      })
      .catch((error) => {
        console.error('[App] Plugin loading failed:', error)
        setPluginsLoaded(true)
      })

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

  if (!pluginsLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-950 text-stone-100">
        Loading plugins...
      </div>
    )
  }

  return (
    <>
      <Layout />
      <PerformanceWindow />
    </>
  )
}

export default App
