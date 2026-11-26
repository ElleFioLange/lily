import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import FullPreview from './components/FullPreview'
import { useBrowserStore } from './stores/useBrowserStore'
import { PerformanceWindow } from './windows/performance/PerformanceWindow'
import { usePerformanceStore } from './stores/usePerformanceStore'
import { useGraphicsStore } from './stores/useGraphicsStore'
import { Compositor } from './graphics/Compositor'
import { useSourcesStore } from './stores/useSourcesStore'
import { setupPreviewSync, usePreviewStore } from './stores/usePreviewStore'
import { loadSources } from './sources'
import run from './utils/actions/run'
import { useWorkingDirectoryStore } from './stores/useWorkingDirectoryStore'
import { useSessionStore } from './stores/useSessionStore'

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

    // List the working directory's .js files for the file browser
    void useWorkingDirectoryStore.getState().load()

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

    // File menu: .lly sessions
    const unsubSession = window.api.session.onMenu((action) => {
      void useSessionStore.getState()[action]()
    })

    const unsubTogglePreview = window.api.actions.onTogglePreview(() =>
      usePreviewStore.getState().toggle()
    )

    // Cmd+Shift+O: the whole window shows the performance output
    const unsubFullPreview = window.api.actions.onToggleFullPreview(() =>
      usePerformanceStore.getState().toggleFullPreview()
    )

    // Cmd+O: show or hide the file browser over the patch
    const unsubToggleBrowser = window.api.actions.onToggleBrowser(() =>
      useBrowserStore.getState().toggle()
    )

    // Cmd+P: in and out of the Poiesis layer
    const unsubTogglePoiesis = window.api.actions.onTogglePoiesis(() =>
      useSourcesStore.getState().togglePoiesis()
    )

    return () => {
      unsubPerformance()
      unsubActions()
      unsubSession()
      unsubTogglePreview()
      unsubTogglePoiesis()
      unsubFullPreview()
      unsubToggleBrowser()
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
      <FullPreview />
      <PerformanceWindow />
      {Object.values(registered).map(({ manifest, Background }) =>
        Background ? <Background key={manifest.id} /> : null
      )}
    </>
  )
}

export default App
