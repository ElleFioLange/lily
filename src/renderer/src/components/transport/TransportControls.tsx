/**
 * TransportControls Component - Legacy
 *
 * This component was part of the Ableton Live transport interface.
 * It has been simplified to show a placeholder.
 *
 * To recreate this functionality:
 * 1. Define transport state in your store
 * 2. Implement play/stop/tempo actions using window.api.osc.send()
 * 3. Update this component to use your new store
 */

import { useOSCStore } from '../../stores/useOSCStore'

export function TransportControls(): React.JSX.Element {
  const lastMessage = useOSCStore((state) => state.lastMessage)

  return (
    <div
      style={{
        padding: '1.5rem',
        borderBottom: '1px solid #333',
        backgroundColor: '#1a1a1a'
      }}
    >
      <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 600 }}>Transport</h2>

      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#888',
          border: '1px dashed #333',
          borderRadius: '8px'
        }}
      >
        <p>Transport controls have been removed.</p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
          Last OSC message: {lastMessage?.address || 'None'}
        </p>
        <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
          See <code>docs/OSC.md</code> for guidance on rebuilding this feature.
        </p>
      </div>
    </div>
  )
}
