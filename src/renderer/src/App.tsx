import { useEffect } from 'react'
import PerformanceLayout from './components/PerformanceLayout'
import AbletonConfigurationLayout from './components/AbletonConfigurationLayout'
import { setupOSCListeners } from './stores/useLiveStore'
import { useLayoutStore, setupLayoutListeners } from './stores/useLayoutStore'
import HydraConfigurationLayout from './components/HydraConfigurationLayout'

function App(): React.JSX.Element {
  const currentLayout = useLayoutStore((state) => state.currentLayout)

  useEffect(() => {
    // Setup OSC event listeners when component mounts
    setupOSCListeners()

    // Setup layout switching listeners
    setupLayoutListeners()

    // Customize this initialization for your application
    // Example: Request initial state, send handshake message, etc.
    // window.api.osc.send('/app/init')
  }, [])

  switch (currentLayout) {
    case 'performance': {
      return <PerformanceLayout />
    }
    case 'ableton-configuration': {
      return <AbletonConfigurationLayout />
    }
    case 'hydra-configuration': {
      return <HydraConfigurationLayout />
    }
  }
}

export default App
