import { useEffect } from 'react'
import PerformanceLayout from './components/PerformanceLayout'
import AbletonConfigurationLayout from './components/AbletonConfigurationLayout'
import { setupOSCListeners } from './stores/useLiveStore'
import { useLayoutStore, setupLayoutListeners } from './stores/useLayoutStore'

function App(): React.JSX.Element {
  const currentLayout = useLayoutStore((state) => state.currentLayout)

  useEffect(() => {
    // Setup OSC event listeners when component mounts
    setupOSCListeners()

    // Setup layout switching listeners
    setupLayoutListeners()

    // Request initial state from Max device
    window.api.osc.requestInit()
  }, [])

  return currentLayout === 'performance' ? <PerformanceLayout /> : <AbletonConfigurationLayout />
}

export default App
