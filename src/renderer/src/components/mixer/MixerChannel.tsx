import type { TrackState } from '../../../../types/osc-messages'

interface MixerChannelProps {
  trackIndex: number
  track: TrackState
  onVolumeChange: (volume: number) => void
  onPanChange: (pan: number) => void
  onMuteToggle: () => void
  onSoloToggle: () => void
}

export function MixerChannel({
  track,
  onVolumeChange,
  onPanChange,
  onMuteToggle,
  onSoloToggle
}: MixerChannelProps): React.JSX.Element {
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onVolumeChange(parseFloat(e.target.value))
  }

  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onPanChange(parseFloat(e.target.value))
  }

  const volumeDb = 20 * Math.log10(track.volume)
  const panPercent = Math.round(track.pan * 100)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '1rem',
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        border: '1px solid #333',
        minWidth: '120px'
      }}
    >
      {/* Track name */}
      <div
        style={{
          marginBottom: '1rem',
          textAlign: 'center',
          fontWeight: 600,
          fontSize: '0.875rem'
        }}
      >
        {track.name}
      </div>

      {/* Volume fader */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '1rem'
        }}
      >
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={track.volume}
          onChange={handleVolumeChange}
          style={{
            width: '200px',
            transform: 'rotate(-90deg)',
            cursor: 'pointer'
          }}
        />
        <div
          style={{
            marginTop: '0.5rem',
            fontSize: '0.75rem',
            color: '#888',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {volumeDb > -60 ? `${volumeDb.toFixed(1)} dB` : '-∞ dB'}
        </div>
      </div>

      {/* Pan knob */}
      <div style={{ marginBottom: '1rem' }}>
        <div
          style={{
            fontSize: '0.75rem',
            color: '#888',
            marginBottom: '0.25rem',
            textAlign: 'center'
          }}
        >
          Pan
        </div>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          value={track.pan}
          onChange={handlePanChange}
          style={{
            width: '100%',
            cursor: 'pointer'
          }}
        />
        <div
          style={{
            fontSize: '0.75rem',
            color: '#888',
            textAlign: 'center',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {track.pan === 0 ? 'C' : track.pan < 0 ? `${panPercent}L` : `${panPercent}R`}
        </div>
      </div>

      {/* Mute/Solo buttons */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem'
        }}
      >
        <button
          onClick={onMuteToggle}
          style={{
            flex: 1,
            padding: '0.5rem',
            backgroundColor: track.mute ? '#eab308' : '#333',
            border: 'none',
            borderRadius: '4px',
            color: track.mute ? '#000' : '#fff',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 600
          }}
        >
          M
        </button>
        <button
          onClick={onSoloToggle}
          style={{
            flex: 1,
            padding: '0.5rem',
            backgroundColor: track.solo ? '#3b82f6' : '#333',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 600
          }}
        >
          S
        </button>
      </div>
    </div>
  )
}
