import { useEffect } from 'react'
// import { ConnectionStatus } from './components/ConnectionStatus'
// import { TransportControls } from './components/transport/TransportControls'
// import { MixerSection } from './components/mixer/MixerSection'
import { setupOSCListeners } from './stores/useLiveStore'

function App(): React.JSX.Element {
  useEffect(() => {
    // Setup OSC event listeners when component mounts
    setupOSCListeners()

    // Request initial state from Max device
    window.api.osc.requestInit()
  }, [])

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        color: '#fff',
        overflow: 'auto'
      }}
    >
      <h1>hello</h1>
    </div>
  )
}

export default App
