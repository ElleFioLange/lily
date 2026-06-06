import { useEffect, useMemo, useState } from 'react'
import type { PoiesisState } from '@renderer/surfaces/poiesis/store'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { AbletonConfigurationKey, ConfigurationJSON, ConfigurationKey } from 'src/types/config'
import { ActivePlugin, WorkspaceProps } from 'src/types/plugins'
import { AbletonState } from '../store'

// ============================================================================
// Color utilities
// ============================================================================

function colorToHex(color: number): string {
  return `#${((color >>> 0) & 0xffffff).toString(16).padStart(6, '0')}`
}

function colorToRgba(color: number, alpha: number): string {
  const r = (color >>> 16) & 0xff
  const g = (color >>> 8) & 0xff
  const b = color & 0xff
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ============================================================================
// Helpers
// ============================================================================

function findTrackForConfig(
  abl: AbletonConfigurationKey,
  project: AbletonProject
): AbletonTrack | null {
  const m = abl.path?.match(/^id (\d+)$/)
  if (!m) return null
  const id = parseInt(m[1])
  const all = [...(project.track_data_arr ?? []), ...(project.return_track_data_arr ?? [])]
  if (abl.type === 'track') return all.find((t) => t.id === id) ?? null
  for (const track of all) {
    for (const device of track.device_data ?? []) {
      if (abl.type === 'device' && device.id === id) return track
      if (abl.type === 'device_parameter' && device.parameters?.some((p) => p.id === id))
        return track
    }
    if (
      abl.type === 'clip' &&
      track.clip_slots_data?.some((s) => s.id === id || s.clip_data?.id === id)
    )
      return track
  }
  return null
}

function defaultsForSelection(
  track: AbletonTrack | null,
  device: AbletonDevice | null,
  param: AbletonDeviceParameter | null
): AbletonConfigurationKey | null {
  if (param)
    return {
      type: 'device_parameter',
      path: `id ${param.id}`,
      object: 'value',
      present: param.max,
      absent: param.min
    }
  if (device)
    return {
      type: 'device',
      path: `id ${device.id}`,
      object: 'active',
      present: true,
      absent: false
    }
  if (track)
    return {
      type: 'track',
      path: `id ${track.id}`,
      object: 'active',
      present: true,
      absent: false
    }
  return null
}

function parseFormValue(val: string): boolean | number {
  if (val === 'true') return true
  if (val === 'false') return false
  const n = parseFloat(val)
  return isNaN(n) ? false : n
}

// ============================================================================
// Shared small components
// ============================================================================

function ColumnHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-stone-400 border-b border-stone-700 shrink-0">
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-stone-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-stone-500'

// ============================================================================
// Keyword Pill
// ============================================================================

function KeywordPill({
  keyword,
  keyConfig,
  project,
  selected,
  onClick
}: {
  keyword: string
  keyConfig: ConfigurationKey
  project: AbletonProject | null
  selected: boolean
  onClick: () => void
}) {
  const track =
    keyConfig.ableton && project ? findTrackForConfig(keyConfig.ableton, project) : null
  const isConnected = !!keyConfig.ableton
  const trackColor = track?.color ?? null

  const pillStyle =
    trackColor != null
      ? {
          backgroundColor: colorToRgba(trackColor, 0.2),
          borderColor: colorToRgba(trackColor, 0.6),
          color: colorToHex(trackColor)
        }
      : {}

  const baseCls = isConnected
    ? trackColor != null
      ? ''
      : 'bg-blue-900/30 border-blue-700/50 text-blue-300'
    : 'bg-stone-800 border-stone-700 text-stone-400'

  return (
    <button
      onClick={onClick}
      style={pillStyle}
      className={`px-2 py-0.5 rounded text-xs border transition-all hover:brightness-125 ${baseCls} ${
        selected ? 'ring-1 ring-stone-300 ring-offset-1 ring-offset-stone-950' : ''
      }`}
    >
      {keyword}
    </button>
  )
}

// ============================================================================
// Connection Form
// ============================================================================

function ConnectionForm({
  keyword,
  existing,
  defaults,
  onSave
}: {
  keyword: string
  existing: AbletonConfigurationKey | undefined
  defaults: AbletonConfigurationKey | null
  onSave: (cfg: AbletonConfigurationKey) => void
}) {
  const fallback: AbletonConfigurationKey = {
    type: 'track',
    path: '',
    object: 'active',
    present: true,
    absent: false
  }
  const [form, setForm] = useState<AbletonConfigurationKey>(existing ?? defaults ?? fallback)

  // Reset when keyword switches
  useEffect(() => {
    setForm(existing ?? defaults ?? fallback)
  }, [keyword]) // eslint-disable-line react-hooks/exhaustive-deps

  const isParam = form.type === 'device_parameter'

  return (
    <div className="flex flex-col gap-4 p-3">
      <p className="text-xs text-stone-400">
        Connecting <span className="text-stone-200 font-mono">{keyword}</span>
      </p>

      <Field label="Type">
        <select
          value={form.type}
          onChange={(e) =>
            setForm((f) => ({ ...f, type: e.target.value as AbletonConfigurationKey['type'] }))
          }
          className={inputCls}
        >
          <option value="track">Track</option>
          <option value="clip">Clip</option>
          <option value="device">Device</option>
          <option value="device_parameter">Device Parameter</option>
        </select>
      </Field>

      <Field label="Path">
        <input
          type="text"
          value={form.path}
          onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))}
          className={`${inputCls} font-mono`}
          placeholder="id 12345"
        />
      </Field>

      {!isParam && (
        <Field label="Object">
          <select
            value={form.object}
            onChange={(e) =>
              setForm((f) => ({ ...f, object: e.target.value as 'active' | 'value' }))
            }
            className={inputCls}
          >
            <option value="active">Active</option>
            <option value="value">Value</option>
          </select>
        </Field>
      )}

      <div className="flex gap-2">
        <Field label="Present">
          <input
            type={isParam ? 'number' : 'text'}
            value={String(form.present)}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                present: isParam ? parseFloat(e.target.value) : parseFormValue(e.target.value)
              }))
            }
            className={`${inputCls} font-mono`}
          />
        </Field>
        <Field label="Absent">
          <input
            type={isParam ? 'number' : 'text'}
            value={String(form.absent)}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                absent: isParam ? parseFloat(e.target.value) : parseFormValue(e.target.value)
              }))
            }
            className={`${inputCls} font-mono`}
          />
        </Field>
      </div>

      <button
        onClick={() => onSave(form)}
        className="px-3 py-1.5 bg-stone-600 hover:bg-stone-500 text-stone-100 text-xs rounded transition-colors"
      >
        {existing ? 'Update Connection' : 'Connect'}
      </button>

      {existing && (
        <button
          onClick={() => onSave({ ...form, path: '' })}
          className="px-3 py-1.5 bg-transparent border border-stone-700 hover:border-stone-500 text-stone-500 hover:text-stone-300 text-xs rounded transition-colors"
        >
          Remove Connection
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Object Info (right column)
// ============================================================================

function ObjectInfo({
  track,
  device,
  param
}: {
  track: AbletonTrack | null
  device: AbletonDevice | null
  param: AbletonDeviceParameter | null
}) {
  if (!track && !device && !param) {
    return (
      <div className="h-full flex items-center justify-center text-stone-600 text-xs p-4 text-center">
        Select an object in the Monitor
      </div>
    )
  }

  if (param) {
    return (
      <div className="flex flex-col gap-4 p-3">
        <div>
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Parameter</p>
          <p className="text-stone-100 text-sm">{param.name}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {(
            [
              ['Value', param.display_value],
              ['Range', `${param.min} – ${param.max}`],
              ['Quantized', param.is_quantized ? 'Yes' : 'No'],
              ['Enabled', param.is_enabled ? 'Yes' : 'No']
            ] as [string, string][]
          ).map(([label, val]) => (
            <div key={label}>
              <p className="text-stone-500">{label}</p>
              <p className="text-stone-200 font-mono">{val}</p>
            </div>
          ))}
        </div>
        <p className="text-stone-600 font-mono text-xs">id {param.id}</p>
      </div>
    )
  }

  if (device) {
    return (
      <div className="flex flex-col gap-4 p-3 overflow-y-auto">
        <div>
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Device</p>
          <p className="text-stone-100 text-sm">{device.name}</p>
          <p className="text-stone-500 text-xs">{device.class_display_name}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`w-1.5 h-1.5 rounded-full ${device.is_active ? 'bg-green-400' : 'bg-stone-600'}`}
          />
          <span className="text-stone-400">{device.is_active ? 'Active' : 'Inactive'}</span>
        </div>
        {(device.parameters?.length ?? 0) > 0 && (
          <div>
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">
              Parameters ({device.parameters.length})
            </p>
            <div className="flex flex-col">
              {device.parameters.slice(0, 10).map((p) => (
                <div key={p.id} className="flex justify-between text-xs py-0.5">
                  <span className="text-stone-400 truncate mr-2">{p.name}</span>
                  <span className="text-stone-500 font-mono shrink-0">{p.display_value}</span>
                </div>
              ))}
              {device.parameters.length > 10 && (
                <p className="text-stone-600 text-xs pt-1">+{device.parameters.length - 10} more</p>
              )}
            </div>
          </div>
        )}
        <p className="text-stone-600 font-mono text-xs">id {device.id}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-3 overflow-y-auto">
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: colorToHex(track!.color) }}
        />
        <div>
          <p className="text-xs text-stone-500 uppercase tracking-wider">Track</p>
          <p className="text-stone-100 text-sm">{track!.name}</p>
        </div>
      </div>
      <div className="flex gap-4 text-xs">
        {[
          track!.mute !== undefined ? { label: 'Mute', val: track!.mute ? 'On' : 'Off' } : null,
          track!.solo !== undefined ? { label: 'Solo', val: track!.solo ? 'On' : 'Off' } : null,
          track!.arm !== undefined ? { label: 'Arm', val: track!.arm ? 'On' : 'Off' } : null
        ]
          .filter((x): x is { label: string; val: string } => x !== null)
          .map(({ label, val }) => (
            <div key={label}>
              <p className="text-stone-500">{label}</p>
              <p className="text-stone-300">{val}</p>
            </div>
          ))}
      </div>
      {(track!.device_data?.length ?? 0) > 0 && (
        <div>
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Devices</p>
          {track!.device_data.map((d) => (
            <div key={d.id} className="flex items-center gap-1.5 py-0.5 text-xs">
              <span
                className={`w-1 h-1 rounded-full ${d.is_active ? 'bg-stone-400' : 'bg-stone-700'}`}
              />
              <span className="text-stone-400">{d.name}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-stone-600 font-mono text-xs">id {track!.id}</p>
    </div>
  )
}

// ============================================================================
// Main component
// ============================================================================

export default function Workspace({ instanceId }: WorkspaceProps) {
  // Ableton store
  const instance = usePluginsStore((s) => s.getInstance(instanceId)) as ActivePlugin<AbletonState>
  const abletonProject = instance.useStore((s) => s.abletonProject) as
    | AbletonProject
    | Record<string, never>
  const selectedTrack = instance.useStore((s) => s.selectedTrack)
  const selectedDevice = instance.useStore((s) => s.selectedDevice)
  const selectedParam = instance.useStore((s) => s.selectedParam)
  const selectedKeyword = instance.useStore((s) => s.selectedKeyword)
  const { setSelectedKeyword } = instance.useStore.getState()

  const project =
    Object.keys(abletonProject).length > 0 ? (abletonProject as AbletonProject) : null

  // Poiesis store — reactive subscription
  const active = usePluginsStore((s) => s.active)
  const poiesisEntry = useMemo(
    () =>
      Object.values(active).find((p) => p.manifest.id === 'poiesis') as
        | ActivePlugin<PoiesisState>
        | undefined,
    [active]
  )

  const [parsedConfig, setParsedConfig] = useState<ConfigurationJSON>(
    () => poiesisEntry?.useStore.getState().parsedConfig ?? {}
  )

  useEffect(() => {
    if (!poiesisEntry) return
    setParsedConfig(poiesisEntry.useStore.getState().parsedConfig)
    return poiesisEntry.useStore.subscribe((state) => setParsedConfig(state.parsedConfig))
  }, [poiesisEntry])

  // Keyword input state
  const [inputValue, setInputValue] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [poemText, setPoemText] = useState('')

  const allKeywords = Object.keys(parsedConfig ?? {})
  const connectedKeywords = allKeywords.filter((k) => parsedConfig![k]?.ableton)
  const unconnectedKeywords = allKeywords.filter((k) => !parsedConfig![k]?.ableton)

  function addKeyword(word: string) {
    const clean = word
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
    if (!clean || !poiesisEntry) return
    const current = poiesisEntry.useStore.getState().parsedConfig ?? {}
    if (current[clean]) return
    poiesisEntry.useStore.getState().setParsedConfig({ ...current, [clean]: {} })
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      addKeyword(inputValue)
      setInputValue('')
    }
  }

  function handleTextareaDoubleClick(e: React.MouseEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget
    const pos = ta.selectionStart
    let start = pos,
      end = pos
    while (start > 0 && /\w/.test(ta.value[start - 1])) start--
    while (end < ta.value.length && /\w/.test(ta.value[end])) end++
    const word = ta.value.slice(start, end)
    if (word) addKeyword(word)
  }

  function handlePoemChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setPoemText(val)
    if (!val) setExpanded(false)
  }

  function handleSaveConnection(cfg: AbletonConfigurationKey) {
    if (!selectedKeyword || !poiesisEntry) return
    const current = poiesisEntry.useStore.getState().parsedConfig ?? {}
    const entry = { ...current[selectedKeyword] }
    if (cfg.path) {
      entry.ableton = cfg
    } else {
      delete entry.ableton
    }
    poiesisEntry.useStore.getState().setParsedConfig({ ...current, [selectedKeyword]: entry })
  }

  const hasSelection = !!(selectedTrack || selectedDevice || selectedParam)
  const showForm = !!(selectedKeyword && hasSelection)
  const defaults = defaultsForSelection(selectedTrack, selectedDevice, selectedParam)

  return (
    <div className="flex flex-row h-full overflow-hidden text-sm font-mono bg-stone-950">
      {/* ── Left: Keywords ── */}
      <div className="flex flex-col w-56 border-r border-stone-700 shrink-0">
        <ColumnHeader>Keywords</ColumnHeader>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0">
          {connectedKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {connectedKeywords.map((k) => (
                <KeywordPill
                  key={k}
                  keyword={k}
                  keyConfig={parsedConfig![k]}
                  project={project}
                  selected={selectedKeyword === k}
                  onClick={() => setSelectedKeyword(selectedKeyword === k ? null : k)}
                />
              ))}
            </div>
          )}

          {connectedKeywords.length > 0 && unconnectedKeywords.length > 0 && (
            <div className="border-t border-stone-800 my-0.5" />
          )}

          {unconnectedKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {unconnectedKeywords.map((k) => (
                <KeywordPill
                  key={k}
                  keyword={k}
                  keyConfig={parsedConfig![k]}
                  project={project}
                  selected={selectedKeyword === k}
                  onClick={() => setSelectedKeyword(selectedKeyword === k ? null : k)}
                />
              ))}
            </div>
          )}

          {allKeywords.length === 0 && (
            <p className="text-stone-600 text-xs">No keywords yet</p>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-stone-700 p-2 shrink-0">
          {expanded ? (
            <div className="flex flex-col gap-1.5">
              <textarea
                value={poemText}
                onChange={handlePoemChange}
                onDoubleClick={handleTextareaDoubleClick}
                placeholder="Paste your poem here!"
                autoFocus
                className={`w-full h-32 ${inputCls} resize-none`}
              />
              <p className="text-stone-600 text-xs">Double-click a word to add as keyword</p>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Add keyword..."
                className={`flex-1 ${inputCls}`}
              />
              <button
                onClick={() => setExpanded(true)}
                className="text-stone-500 hover:text-stone-300 px-1 text-base leading-none transition-colors"
                title="Paste poem"
              >
                ↑
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Middle: Connection form ── */}
      <div className="flex flex-col w-64 border-r border-stone-700 shrink-0">
        <ColumnHeader>
          {showForm && selectedKeyword ? `"${selectedKeyword}"` : 'Connection'}
        </ColumnHeader>
        <div className="flex-1 overflow-y-auto">
          {showForm ? (
            <ConnectionForm
              keyword={selectedKeyword!}
              existing={parsedConfig?.[selectedKeyword!]?.ableton}
              defaults={defaults}
              onSave={handleSaveConnection}
            />
          ) : (
            <div className="h-full flex items-center justify-center p-4">
              <p className="text-stone-600 text-xs text-center">
                {!selectedKeyword && !hasSelection
                  ? 'Select a keyword and an object in the Monitor'
                  : !selectedKeyword
                    ? 'Select a keyword'
                    : 'Select an object in the Monitor'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Object info ── */}
      <div className="flex flex-col flex-1 min-w-0">
        <ColumnHeader>
          {selectedParam
            ? 'Parameter'
            : selectedDevice
              ? 'Device'
              : selectedTrack
                ? 'Track'
                : 'Object'}
        </ColumnHeader>
        <div className="flex-1 overflow-y-auto">
          <ObjectInfo track={selectedTrack} device={selectedDevice} param={selectedParam} />
        </div>
      </div>
    </div>
  )
}
