import { useEffect } from 'react'
import Layout from './components/Layout'
import { setupOSCListeners } from './stores/useLiveStore'

function App(): React.JSX.Element {
  useEffect(() => {
    // Setup OSC event listeners when component mounts
    setupOSCListeners()

    // Request initial state from Max device
    window.api.osc.requestInit()
  }, [])

  return <Layout />
}

export default App
