import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import { PerformanceWindow } from './windows/performance/PerformanceWindow'
import { usePerformanceStore } from './stores/usePerformanceStore'
import { useGraphicsStore } from './stores/useGraphicsStore'
import { Compositor } from './graphics/Compositor'
import { useSourcesStore } from './stores/useSourcesStore'
import { setupPreviewSync, usePreviewStore } from './stores/usePreviewStore'
import { loadSources } from './sources'
import run from './utils/actions/run'

function App(): React.JSX.Element {
  const togglePerformanceWindow = usePerformanceStore((state) => state.toggleWindow)
  const { setCompositorRef } = useGraphicsStore()
  const { registerSource, registered } = useSourcesStore()
  const [sourcesLoaded, setSourcesLoaded] = useState(false)

  useEffect(() => {
    // Initialize the compositor
    const compositor = new Compositor()
    setCompositorRef(compositor)

    // Mirror live sources into the preview mix (preview mode, Cmd+Alt+P)
    const unsubPreviewSync = setupPreviewSync()

    // Register the mixer's sources (Hydra, plus Poiesis when enabled)
    loadSources()
      .then((sources) => {
        sources.forEach(registerSource)
        useSourcesStore.getState().startSession()
        setSourcesLoaded(true)
      })
      .catch((error) => {
        console.error('[App] Source loading failed:', error)
        setSourcesLoaded(true)
      })

    // Listen for performance window toggle from menu
    const unsubPerformance = window.api.performance.onToggle(() => {
      togglePerformanceWindow()
    })

    const unsubActions = window.api.actions.onRun(run)

    // Toggle the focused hydra instance's monitor (Cmd+Shift+M). No-op when the
    // focused surface isn't a hydra instance.
    const unsubToggleMonitor = window.api.actions.onToggleMonitor(() => {
      const { active, focused } = useSourcesStore.getState()
      if (!focused) return
      const source = active[focused]
      if (!source || source.manifest.id !== 'hydra') return
      const { useStore } = source as unknown as {
        useStore?: { getState: () => { toggleMonitor: () => void } }
      }
      useStore?.getState().toggleMonitor()
    })

    const unsubTogglePreview = window.api.actions.onTogglePreview(() =>
      usePreviewStore.getState().toggle()
    )

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

  if (!sourcesLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-950 text-stone-100">
        Loading...
      </div>
    )
  }

  return (
    <>
      <Layout />
      <PerformanceWindow />
      {Object.values(registered).map(({ manifest, Background }) =>
        Background ? <Background key={manifest.id} /> : null
      )}
    </>
  )
}

export default App
