import { useEffect } from 'react'
import PerformanceLayout from './components/PerformanceLayout'
import AbletonConfigurationLayout from './components/AbletonConfigurationLayout'
import { setupOSCListeners } from './stores/useOSCStore'
import { useLayoutStore, setupLayoutListeners } from './stores/useLayoutStore'
import HydraConfigurationLayout from './components/HydraConfigurationLayout'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { initializeConfigStore } from './stores/useConfigurationStore'

function App(): React.JSX.Element {
  const currentLayout = useLayoutStore((state) => state.currentLayout)

  // Initialize keyboard shortcuts
  useKeyboardShortcuts()

  useEffect(() => {
    // Setup OSC event listeners when component mounts
    setupOSCListeners()

    // Setup layout switching listeners
    setupLayoutListeners()

    // Initialize configuration store
    initializeConfigStore()

    window.api.osc.send('/request/connection/confirm')
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
