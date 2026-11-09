import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import { PerformanceWindow } from './windows/performance/PerformanceWindow'
// import { setupOSCListeners } from './stores/useOSCStore'
// import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { setupCameraListeners } from './stores/useCameraStore'
import { usePerformanceStore } from './stores/usePerformanceStore'
import { useGraphicsStore } from './stores/useGraphicsStore'
import { Compositor } from './graphics/Compositor'
import PoiesisPlugin from './surfaces/poiesis'
import { usePluginsStore } from './stores/usePluginsStore'
import { setupPreviewSync, usePreviewStore } from './stores/usePreviewStore'
import { loadPlugins } from './utils/loadPlugins'
import run from './utils/actions/run'
import { useMalletKeyboard } from './hooks/useMalletKeyboard'

function App(): React.JSX.Element {
  const togglePerformanceWindow = usePerformanceStore((state) => state.toggleWindow)
  const { setCompositorRef } = useGraphicsStore()
  const { registerPlugin } = usePluginsStore()
  const [pluginsLoaded, setPluginsLoaded] = useState(false)
  const [malletEnabled, setMalletEnabled] = useState(false)

  useMalletKeyboard(malletEnabled)

  // Reload settings on mount and whenever this window regains focus (e.g. after closing settings)
  useEffect(() => {
    const load = () =>
      window.api.settings.get().then((s) => setMalletEnabled(s.malletKeyboard.enabled))
    load()
    window.addEventListener('focus', load)
    return () => window.removeEventListener('focus', load)
  }, [])

  // Initialize keyboard shortcuts
  // useKeyboardShortcuts()

  useEffect(() => {
    // Initialize the compositor
    const compositor = new Compositor()
    setCompositorRef(compositor)

    // Mirror live sources into the preview mix (preview mode, Cmd+Alt+P)
    const unsubPreviewSync = setupPreviewSync()

    // Register Poiesis plug-in
    registerPlugin(PoiesisPlugin)

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
    // setupOSCListeners()

    // Setup camera streaming listeners
    setupCameraListeners()

    // Listen for performance window toggle from menu
    const unsubPerformance = window.api.performance.onToggle(() => {
      togglePerformanceWindow()
    })

    const unsubActions = window.api.actions.onRun(run)

    // Toggle the focused hydra instance's monitor (Cmd+Shift+M). No-op when the
    // focused surface isn't a hydra instance.
    const unsubToggleMonitor = window.api.actions.onToggleMonitor(() => {
      const { active, focused } = usePluginsStore.getState()
      if (!focused) return
      const plugin = active[focused]
      if (!plugin || plugin.manifest.id !== 'hydra') return
      const { useStore } = plugin as unknown as {
        useStore?: { getState: () => { toggleMonitor: () => void } }
      }
      useStore?.getState().toggleMonitor()
    })

    const unsubTogglePreview = window.api.actions.onTogglePreview(() =>
      usePreviewStore.getState().toggle()
    )

    console.log('hello')

    window.api.osc.send('/request/connection/confirm')

    return () => {
      unsubPerformance()
      unsubActions()
      unsubToggleMonitor()
      unsubTogglePreview()
      unsubPreviewSync()
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
