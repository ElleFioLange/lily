import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { UIProps, ActivePlugin } from 'src/types/plugins'
import { AbletonState } from '../store'

function abletonColorToHex(color: number): string {
  return `#${((color >>> 0) & 0xffffff).toString(16).padStart(6, '0')}`
}

function ColumnHeader({
  children,
  onRefresh
}: {
  children: React.ReactNode
  onRefresh?: () => void
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider text-stone-400 border-b border-stone-700 shrink-0">
      <span>{children}</span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="text-stone-500 hover:text-stone-300 transition-colors"
          title="Refresh"
        >
          ↺
        </button>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-stone-500">
      {children}
    </div>
  )
}

function Row({
  selected,
  onClick,
  children
}: {
  selected?: boolean
  onClick?: () => void
  children: React.ReactNode
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none ${
        selected ? 'bg-stone-600 text-stone-100' : 'text-stone-300 hover:bg-stone-700'
      }`}
    >
      {children}
    </div>
  )
}

export default function Monitor({ instanceId }: UIProps) {
  const instance = usePluginsStore((s) => s.getInstance(instanceId)) as ActivePlugin<AbletonState>

  const abletonProject = instance.useStore((s) => s.abletonProject) as
    | AbletonProject
    | Record<string, never>
  const selectedTrack = instance.useStore((s) => s.selectedTrack)
  const selectedClipSlot = instance.useStore((s) => s.selectedClipSlot)
  const selectedDevice = instance.useStore((s) => s.selectedDevice)
  const selectedParam = instance.useStore((s) => s.selectedParam)

  const { setSelectedTrack, setSelectedClipSlot, setSelectedDevice, setSelectedParam } =
    instance.useStore.getState()

  const tracks = (abletonProject as AbletonProject).track_data_arr ?? []
  const isEmpty = tracks.length === 0
  const clips = selectedTrack?.clip_slots_data?.filter((s) => s.has_clip) ?? []
  const devices = selectedTrack?.device_data ?? []
  const params = selectedDevice?.parameters ?? []

  return (
    <div className="flex flex-row h-full overflow-hidden text-sm font-mono bg-stone-950">
      {/* Column 1: Tracks */}
      <div className="flex flex-col w-52 border-r border-stone-700 shrink-0">
        <ColumnHeader onRefresh={() => window.api.osc.send('/get-state', [])}>Tracks</ColumnHeader>
        <div className="overflow-y-auto flex-1">
          {isEmpty ? (
            <div className="px-3 py-4 text-stone-500 text-xs">No project loaded</div>
          ) : (
            tracks.map((track) => (
              <Row
                key={track.id}
                selected={selectedTrack?.id === track.id}
                onClick={() => setSelectedTrack(track)}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: abletonColorToHex(track.color) }}
                />
                <span className="truncate">{track.name}</span>
                {track.mute && <span className="ml-auto text-stone-500 text-xs shrink-0">M</span>}
              </Row>
            ))
          )}
        </div>
      </div>

      {/* Column 2: Clips + Devices */}
      {selectedTrack && (
        <div className="flex flex-col w-52 border-r border-stone-700 shrink-0">
          <ColumnHeader>{selectedTrack.name}</ColumnHeader>
          <div className="overflow-y-auto flex-1">
            {clips.length > 0 && (
              <>
                <SectionLabel>Clips</SectionLabel>
                {clips.map((slot) => {
                  const clip = slot.clip_data
                  if (!clip) return null
                  return (
                    <Row
                      key={slot.id}
                      selected={selectedClipSlot?.id === slot.id}
                      onClick={() =>
                        setSelectedClipSlot(selectedClipSlot?.id === slot.id ? null : slot)
                      }
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          clip.is_playing ? 'bg-green-400' : 'bg-stone-600'
                        }`}
                      />
                      <span className="truncate">{clip.name || 'Untitled'}</span>
                    </Row>
                  )
                })}
              </>
            )}

            {devices.length > 0 && (
              <>
                <SectionLabel>Devices</SectionLabel>
                {devices.map((device) => (
                  <Row
                    key={device.id}
                    selected={selectedDevice?.id === device.id}
                    onClick={() => setSelectedDevice(device)}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        device.is_active ? 'bg-stone-400' : 'bg-stone-600'
                      }`}
                    />
                    <span className="truncate">{device.name}</span>
                    <span className="ml-auto text-stone-500 text-xs shrink-0">›</span>
                  </Row>
                ))}
              </>
            )}

            {clips.length === 0 && devices.length === 0 && (
              <div className="px-3 py-4 text-stone-500 text-xs">Empty track</div>
            )}
          </div>
        </div>
      )}

      {/* Column 3: Parameters */}
      {selectedDevice && (
        <div className="flex flex-col w-64 shrink-0">
          <ColumnHeader>{selectedDevice.name}</ColumnHeader>
          <div className="overflow-y-auto flex-1">
            {params.length === 0 ? (
              <div className="px-3 py-4 text-stone-500 text-xs">No parameters</div>
            ) : (
              params.map((param) => (
                <div
                  key={param.id}
                  onClick={() => setSelectedParam(selectedParam?.id === param.id ? null : param)}
                  className={`flex items-center justify-between px-3 py-1.5 gap-2 cursor-pointer select-none ${
                    selectedParam?.id === param.id ? 'bg-stone-600' : 'hover:bg-stone-800'
                  } ${param.is_enabled ? 'text-stone-300' : 'text-stone-600'}`}
                >
                  <span className="truncate">{param.name}</span>
                  <span className="text-stone-400 shrink-0 text-right min-w-16">
                    {param.display_value}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
