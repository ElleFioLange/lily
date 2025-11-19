import { useLiveStore } from '../../stores/useLiveStore'

export function TransportControls(): React.JSX.Element {
  const transport = useLiveStore((state) => state.transport)
  const play = useLiveStore((state) => state.play)
  const stop = useLiveStore((state) => state.stop)
  const changeTempo = useLiveStore((state) => state.changeTempo)

  const handleTempoChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newTempo = parseFloat(e.target.value)
    changeTempo(newTempo)
  }

  return (
    <div
      style={{
        padding: '1.5rem',
        borderBottom: '1px solid #333',
        backgroundColor: '#1a1a1a'
      }}
    >
      <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 600 }}>Transport</h2>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        {/* Play/Stop buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={play}
            disabled={transport.isPlaying}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: transport.isPlaying ? '#16a34a' : '#22c55e',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: transport.isPlaying ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: 600,
              opacity: transport.isPlaying ? 0.6 : 1
            }}
          >
            {transport.isPlaying ? '▶ Playing' : '▶ Play'}
          </button>
          <button
            onClick={stop}
            disabled={!transport.isPlaying}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: !transport.isPlaying ? '#991b1b' : '#dc2626',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: !transport.isPlaying ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              fontWeight: 600,
              opacity: !transport.isPlaying ? 0.6 : 1
            }}
          >
            ■ Stop
          </button>
        </div>

        {/* Tempo control */}
        <div style={{ flex: 1, maxWidth: '400px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.5rem',
              alignItems: 'baseline'
            }}
          >
            <label style={{ fontWeight: 500 }}>Tempo</label>
            <span
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {transport.tempo.toFixed(1)} BPM
            </span>
          </div>
          <input
            type="range"
            min="60"
            max="200"
            step="0.1"
            value={transport.tempo}
            onChange={handleTempoChange}
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              outline: 'none',
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((transport.tempo - 60) / 140) * 100}%, #333 ${((transport.tempo - 60) / 140) * 100}%, #333 100%)`,
              cursor: 'pointer'
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '0.25rem',
              fontSize: '0.75rem',
              color: '#888'
            }}
          >
            <span>60 BPM</span>
            <span>200 BPM</span>
          </div>
        </div>
      </div>
    </div>
  )
}
