/**
 * MixerSection Component - Legacy
 *
 * This component was part of the Ableton Live mixer interface.
 * It has been simplified to show a placeholder.
 *
 * To recreate this functionality:
 * 1. Define track state in your store
 * 2. Implement track control actions
 * 3. Update MixerChannel component
 */

import { useOSCStore } from '../../stores/useOSCStore'

export function MixerSection(): React.JSX.Element {
  // Example: You would define your mixer state here
  // const tracks = useMixerStore((state) => state.tracks)
  // const setTrackVolume = useMixerStore((state) => state.setTrackVolume)
  const lastMessage = useOSCStore((state) => state.lastMessage)

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 600 }}>Mixer</h2>

      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#888',
          border: '1px dashed #333',
          borderRadius: '8px'
        }}
      >
        <p>Mixer functionality has been removed.</p>
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
