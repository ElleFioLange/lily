import { useEffect, useRef } from 'react'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin, UIProps } from 'src/types/plugins'
import { LiveState } from '../store'
import { LiveTrack } from '../bridge'
import { colorStyle } from './colors'

// Session-style monitor of the open Live Set, read from the extension bridge.
// One column per track: name header, clips, then devices. "Show in Lily" in
// Live highlights the matching node here (and foregrounds the app).

const ROW = 'px-2 py-0.5 truncate border-l-4'
const highlight = (selected: boolean) => (selected ? 'border-stone-100' : 'border-transparent')

function TrackColumn({ track, selectedPath }: { track: LiveTrack; selectedPath: string | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const containsSelection =
    selectedPath !== null &&
    (track.id === selectedPath ||
      track.clips.some((c) => c.id === selectedPath) ||
      track.devices.some((d) => d.id === selectedPath))

  useEffect(() => {
    if (containsSelection) ref.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [containsSelection, selectedPath])

  return (
    <div ref={ref} className="flex flex-col gap-1 w-36 shrink-0 min-h-0">
      <div
        className={`px-2 py-1 truncate font-bold border-l-4 ${highlight(track.id === selectedPath)}`}
        style={colorStyle(track.color)}
        title={track.id}
      >
        {track.name}
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto no-scrollbar">
        {track.clips.map((c) => (
          <div
            key={c.id}
            className={`${ROW} ${highlight(c.id === selectedPath)}`}
            style={colorStyle(c.color)}
            title={`${c.kind} · ${c.id}`}
          >
            {c.name || '(unnamed)'}
          </div>
        ))}
        {track.devices.map((d) => (
          <div
            key={d.id}
            className={`${ROW} ${highlight(d.id === selectedPath)} bg-stone-800 text-stone-300`}
            title={d.id}
          >
            ◆ {d.name}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Monitor({ instanceId }: UIProps) {
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<LiveState>
  const { snapshot, liveTracks, refreshing, refreshError, selection, refresh } =
    instance.useStore()

  const selectedPath = selection?.maxPath ?? null

  return (
    <div className="h-full flex flex-col text-xs font-neon text-stone-100">
      <div className="flex items-baseline gap-3 px-3 py-1.5 shrink-0">
        <button
          onClick={() => void refresh()}
          disabled={refreshing}
          className="border border-stone-600 px-2 py-0.5 hover:bg-stone-800 disabled:opacity-50"
        >
          {refreshing ? 'refreshing…' : 'refresh'}
        </button>
        {snapshot && (
          <span className="text-stone-400 shrink-0">
            {snapshot.tempo} bpm · {liveTracks.length} tracks
          </span>
        )}
        {selection && (
          <span className="text-stone-400 truncate">
            selected: {selection.trackName}
            {selection.type === 'clip' ? ` › ${selection.name}` : ''}
            {selection.inArrangement ? ' (arrangement)' : ''}
          </span>
        )}
        {refreshError && (
          <span className="text-rose-400 truncate" title={refreshError}>
            bridge unreachable — is Live running with the Lily extension?
          </span>
        )}
      </div>

      {liveTracks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-stone-500 italic">
          {refreshing ? 'loading live set…' : 'no live set — refresh with Live open'}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-x-auto flex gap-1 px-3 pb-2">
          {liveTracks.map((t) => (
            <TrackColumn key={t.id} track={t} selectedPath={selectedPath} />
          ))}
        </div>
      )}
    </div>
  )
}
