import { useLiveStore } from '../../stores/useLiveStore'
import { MixerChannel } from './MixerChannel'

export function MixerSection(): React.JSX.Element {
  const tracks = useLiveStore((state) => state.tracks)
  const setTrackVolume = useLiveStore((state) => state.setTrackVolume)
  const setTrackPan = useLiveStore((state) => state.setTrackPan)
  const setTrackMute = useLiveStore((state) => state.setTrackMute)
  const setTrackSolo = useLiveStore((state) => state.setTrackSolo)

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 600 }}>Mixer</h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '1rem',
          maxWidth: '1200px'
        }}
      >
        {tracks.map((track, index) => (
          <MixerChannel
            key={index}
            trackIndex={index}
            track={track}
            onVolumeChange={(volume) => setTrackVolume(index, volume)}
            onPanChange={(pan) => setTrackPan(index, pan)}
            onMuteToggle={() => setTrackMute(index, !track.mute)}
            onSoloToggle={() => setTrackSolo(index, !track.solo)}
          />
        ))}
      </div>
    </div>
  )
}
