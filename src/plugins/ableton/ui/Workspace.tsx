import jsyaml from 'js-yaml'
import { resolveConnectionPaths } from '../autoname'
import { useEffect, useMemo, useState } from 'react'
import type { PoiesisState } from '@renderer/surfaces/poiesis/store'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import {
  AbletonConfigurationKey,
  ArgPreset,
  ConfigurationJSON,
  ConfigurationKey,
  KeyArgument
} from 'src/types/config'
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
// Path + defaults helpers
// ============================================================================

function generateLivePath(
  project: AbletonProject,
  track: AbletonTrack,
  clipSlot: AbletonClipSlot | null,
  device: AbletonDevice | null,
  param: AbletonDeviceParameter | null
): string {
  let trackIdx = project.track_data_arr.findIndex((t) => t.id === track.id)
  let trackBase: string
  if (trackIdx >= 0) {
    trackBase = `live_set tracks ${trackIdx}`
  } else {
    trackIdx = project.return_track_data_arr?.findIndex((t) => t.id === track.id) ?? -1
    trackBase = trackIdx >= 0 ? `live_set return_tracks ${trackIdx}` : 'live_set tracks 0'
  }

  if (clipSlot) {
    const slotIdx = track.clip_slots_data?.findIndex((s) => s.id === clipSlot.id) ?? 0
    return `${trackBase} clip_slots ${slotIdx} clip`
  }

  if (device) {
    const devIdx = track.device_data.findIndex((d) => d.id === device.id)
    const devBase = `${trackBase} devices ${devIdx}`
    if (param) {
      const paramIdx = device.parameters.findIndex((p) => p.id === param.id)
      return `${devBase} parameters ${paramIdx}`
    }
    return devBase
  }

  return trackBase
}

function findTrackForConfig(
  abl: AbletonConfigurationKey,
  project: AbletonProject
): AbletonTrack | null {
  // Match both Live path ("live_set tracks 2 ...") and legacy id paths
  const idMatch = abl.path?.match(/^id (\d+)$/)
  if (idMatch) {
    const id = parseInt(idMatch[1])
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

  // Extract track index from Live path ("live_set tracks N ...")
  const liveMatch = abl.path?.match(/live_set (?:return_)?tracks (\d+)/)
  if (liveMatch) {
    const idx = parseInt(liveMatch[1])
    const isReturn = abl.path.includes('return_tracks')
    const arr = isReturn ? project.return_track_data_arr : project.track_data_arr
    return arr?.[idx] ?? null
  }

  return null
}

function defaultsForSelection(
  project: AbletonProject | null,
  track: AbletonTrack | null,
  clipSlot: AbletonClipSlot | null,
  device: AbletonDevice | null,
  param: AbletonDeviceParameter | null
): AbletonConfigurationKey | null {
  if (!track || !project) return null
  const path = generateLivePath(project, track, clipSlot, device, param)
  if (param)
    return {
      type: 'device_parameter',
      path,
      object: 'value',
      present: param.max,
      absent: param.min
    }
  if (clipSlot) return { type: 'clip', path, object: 'active', present: true, absent: false }
  if (device) return { type: 'device', path, object: 'active', present: true, absent: false }
  return { type: 'track', path, object: 'active', present: true, absent: false }
}

function parseVal(s: string): boolean | number {
  if (s === 'true') return true
  if (s === 'false') return false
  const n = parseFloat(s)
  return isNaN(n) ? false : n
}

// ============================================================================
// Shared UI primitives
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
    <div className="flex flex-col gap-1 flex-1">
      <label className="text-xs text-stone-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'bg-stone-900 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-stone-500 w-full'

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
  keyConfig: ConfigurationKey | undefined
  project: AbletonProject | null
  selected: boolean
  onClick: () => void
}) {
  const track = keyConfig?.ableton && project ? findTrackForConfig(keyConfig.ableton, project) : null
  const isConnected = !!keyConfig?.ableton
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
// Argument editor
// ============================================================================

function ArgEditor({
  name,
  arg,
  onChange,
  onRemove
}: {
  name: string
  arg: KeyArgument
  onChange: (a: KeyArgument) => void
  onRemove: () => void
}) {
  const [newPreset, setNewPreset] = useState('')

  function updateAbleton(type: KeyArgument['ableton']) {
    onChange({ ...arg, ableton: type })
  }

  function updateDefault(val: string) {
    onChange({ ...arg, default_value: { ...arg.default_value, ableton: parseVal(val) } })
  }

  function updatePreset(preset: string, val: string) {
    onChange({
      ...arg,
      presets: {
        ...(arg.presets ?? {}),
        [preset]: { ...(arg.presets?.[preset] ?? {}), ableton: parseVal(val) }
      }
    })
  }

  function removePreset(preset: string) {
    const next = { ...(arg.presets ?? {}) }
    delete next[preset]
    onChange({ ...arg, presets: Object.keys(next).length ? next : undefined })
  }

  function addPreset() {
    const name = newPreset.trim().replace(/\s+/g, '_')
    if (!name) return
    onChange({ ...arg, presets: { ...(arg.presets ?? {}), [name]: { ableton: 0 } } })
    setNewPreset('')
  }

  return (
    <div className="border border-stone-800 rounded p-2.5 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-stone-200 text-xs font-mono">{name}</span>
        <button
          onClick={onRemove}
          className="text-stone-600 hover:text-stone-400 text-sm leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex gap-2">
        <Field label="Type">
          <select
            value={arg.ableton?.type ?? 'number'}
            onChange={(e) =>
              updateAbleton({
                acts_on: 'path',
                type: e.target.value as 'number' | 'string' | 'boolean'
              })
            }
            className={inputCls}
          >
            <option value="number">number</option>
            <option value="string">string</option>
            <option value="boolean">boolean</option>
          </select>
        </Field>
        <Field label="Default">
          <input
            type="text"
            value={String(arg.default_value?.ableton ?? '')}
            onChange={(e) => updateDefault(e.target.value)}
            className={`${inputCls} font-mono`}
          />
        </Field>
      </div>

      {/* Presets */}
      <div className="flex flex-col gap-1">
        <p className="text-xs text-stone-600 uppercase tracking-wider">Presets</p>
        {Object.entries(arg.presets ?? {}).map(([preset, val]) => (
          <div key={preset} className="flex items-center gap-1">
            <span className="text-stone-500 font-mono text-xs w-16 shrink-0 truncate">
              {preset}
            </span>
            <span className="text-stone-700 text-xs">→</span>
            <input
              type="text"
              value={String((val as ArgPreset).ableton ?? '')}
              onChange={(e) => updatePreset(preset, e.target.value)}
              className={`flex-1 ${inputCls} font-mono`}
            />
            <button
              onClick={() => removePreset(preset)}
              className="text-stone-600 hover:text-stone-400 text-sm leading-none px-0.5"
            >
              ×
            </button>
          </div>
        ))}
        <div className="flex gap-1 pt-0.5">
          <input
            type="text"
            value={newPreset}
            onChange={(e) => setNewPreset(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPreset()}
            placeholder="preset name"
            className={`flex-1 ${inputCls} font-mono`}
          />
          <button
            onClick={addPreset}
            className="text-stone-500 hover:text-stone-300 px-2 py-1 text-xs border border-stone-700 rounded transition-colors"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Connection Form
// ============================================================================

function ConnectionForm({
  keyword,
  existing,
  defaultAbleton,
  onSave,
  onRemove
}: {
  keyword: string
  existing: ConfigurationKey | undefined
  defaultAbleton: AbletonConfigurationKey | null
  onSave: (entry: ConfigurationKey) => void
  onRemove: () => void
}) {
  const fallback: AbletonConfigurationKey = {
    type: 'track',
    path: '',
    object: 'active',
    present: true,
    absent: false
  }

  // Form is keyed externally — no useEffect needed for reset
  const [abl, setAbl] = useState<AbletonConfigurationKey>(
    existing?.ableton ?? defaultAbleton ?? fallback
  )
  const [args, setArgs] = useState<Record<string, KeyArgument>>(existing?.args ?? {})
  const [newArgName, setNewArgName] = useState('')

  const isParam = abl.type === 'device_parameter'

  function addArg() {
    const clean = newArgName.trim().replace(/[^a-z0-9_]/g, '')
    if (!clean || args[clean]) return
    setArgs((a) => ({
      ...a,
      [clean]: { ableton: { acts_on: 'path', type: 'number' }, default_value: { ableton: 0 } }
    }))
    setNewArgName('')
  }

  function handleSave() {
    const entry: ConfigurationKey = { ...(existing ?? {}) }
    if (abl.path) {
      entry.ableton = abl
    } else {
      delete entry.ableton
    }
    if (Object.keys(args).length > 0) {
      entry.args = args
    } else {
      delete entry.args
    }
    onSave(entry)
  }

  return (
    <div className="flex flex-col gap-4 p-3">
      <p className="text-xs text-stone-400">
        Connecting <span className="text-stone-200 font-mono">{keyword}</span>
      </p>

      {/* Ableton config */}
      <Field label="Type">
        <select
          value={abl.type}
          onChange={(e) =>
            setAbl((f) => ({ ...f, type: e.target.value as AbletonConfigurationKey['type'] }))
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
          value={abl.path}
          onChange={(e) => setAbl((f) => ({ ...f, path: e.target.value }))}
          className={`${inputCls} font-mono`}
          placeholder="live_set tracks 0 clip_slots 0 clip"
        />
        {defaultAbleton && defaultAbleton.path !== abl.path && (
          <button
            onClick={() =>
              setAbl((f) => ({ ...f, path: defaultAbleton.path, type: defaultAbleton.type }))
            }
            className="text-stone-600 hover:text-stone-400 text-xs text-left mt-0.5 font-mono"
          >
            ← {defaultAbleton.path}
          </button>
        )}
      </Field>

      {!isParam && (
        <Field label="Object">
          <select
            value={abl.object}
            onChange={(e) =>
              setAbl((f) => ({ ...f, object: e.target.value as 'active' | 'value' }))
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
            value={String(abl.present)}
            onChange={(e) =>
              setAbl((f) => ({
                ...f,
                present: isParam ? parseFloat(e.target.value) : parseVal(e.target.value)
              }))
            }
            className={`${inputCls} font-mono`}
          />
        </Field>
        <Field label="Absent">
          <input
            type={isParam ? 'number' : 'text'}
            value={String(abl.absent)}
            onChange={(e) =>
              setAbl((f) => ({
                ...f,
                absent: isParam ? parseFloat(e.target.value) : parseVal(e.target.value)
              }))
            }
            className={`${inputCls} font-mono`}
          />
        </Field>
      </div>

      {/* Arguments */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-stone-500 uppercase tracking-wider">Arguments</p>
        </div>

        {Object.entries(args).map(([name, arg]) => (
          <ArgEditor
            key={name}
            name={name}
            arg={arg}
            onChange={(updated) => setArgs((a) => ({ ...a, [name]: updated }))}
            onRemove={() =>
              setArgs((a) => {
                const next = { ...a }
                delete next[name]
                return next
              })
            }
          />
        ))}

        <div className="flex gap-1">
          <input
            type="text"
            value={newArgName}
            onChange={(e) => setNewArgName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addArg()}
            placeholder="argument name"
            className={`flex-1 ${inputCls} font-mono`}
          />
          <button
            onClick={addArg}
            className="text-stone-500 hover:text-stone-300 px-2 py-1 text-xs border border-stone-700 rounded transition-colors"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <button
          onClick={handleSave}
          className="px-3 py-1.5 bg-stone-600 hover:bg-stone-500 text-stone-100 text-xs rounded transition-colors"
        >
          {existing?.ableton ? 'Update' : 'Connect'}
        </button>
        {existing?.ableton && (
          <button
            onClick={onRemove}
            className="px-3 py-1.5 border border-stone-700 hover:border-stone-500 text-stone-500 hover:text-stone-300 text-xs rounded transition-colors"
          >
            Remove Connection
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Object Info (right column)
// ============================================================================

function ObjectInfo({
  track,
  clipSlot,
  device,
  param,
  keywords
}: {
  track: AbletonTrack | null
  clipSlot: AbletonClipSlot | null
  device: AbletonDevice | null
  param: AbletonDeviceParameter | null
  keywords?: React.ReactNode
}) {
  if (!track && !device && !param && !clipSlot) {
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
          <p className="text-stone-100 text-sm flex items-center gap-1.5 min-w-0">
            {track && (
              <>
                <span className="shrink-0" style={{ color: colorToHex(track.color) }}>
                  {track.name}
                </span>
                <span className="text-stone-600 shrink-0">›</span>
              </>
            )}
            {device && (
              <>
                <span className="shrink-0 text-stone-400">{device.name}</span>
                <span className="text-stone-600 shrink-0">›</span>
              </>
            )}
            <span className="truncate">{param.name}</span>
          </p>
        </div>
        {keywords}
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

  if (clipSlot) {
    const clip = clipSlot.clip_data
    return (
      <div className="flex flex-col gap-4 p-3">
        <div>
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Clip</p>
          <p className="text-stone-100 text-sm flex items-center gap-1.5 min-w-0">
            {track && (
              <>
                <span className="shrink-0" style={{ color: colorToHex(track.color) }}>
                  {track.name}
                </span>
                <span className="text-stone-600 shrink-0">›</span>
              </>
            )}
            <span className="truncate">{clip?.name || 'Untitled'}</span>
          </p>
        </div>
        {keywords}
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`w-1.5 h-1.5 rounded-full ${clip?.is_playing ? 'bg-green-400' : 'bg-stone-600'}`}
          />
          <span className="text-stone-400">
            {clip?.is_playing ? 'Playing' : clip?.is_recording ? 'Recording' : 'Stopped'}
          </span>
        </div>
        {clip && (
          <div className="grid grid-cols-2 gap-3 text-xs">
            {(
              [
                ['Length', String(clip.length)],
                ['Looping', clip.looping ? 'Yes' : 'No'],
                ['Muted', clip.muted ? 'Yes' : 'No']
              ] as [string, string][]
            ).map(([label, val]) => (
              <div key={label}>
                <p className="text-stone-500">{label}</p>
                <p className="text-stone-200 font-mono">{val}</p>
              </div>
            ))}
          </div>
        )}
        <p className="text-stone-600 font-mono text-xs">id {clipSlot.id}</p>
      </div>
    )
  }

  if (device) {
    return (
      <div className="flex flex-col gap-4 p-3 overflow-y-auto">
        <div>
          <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Device</p>
          <p className="text-stone-100 text-sm flex items-center gap-1.5 min-w-0">
            {track && (
              <>
                <span className="shrink-0" style={{ color: colorToHex(track.color) }}>
                  {track.name}
                </span>
                <span className="text-stone-600 shrink-0">›</span>
              </>
            )}
            <span className="truncate">{device.name}</span>
          </p>
        </div>
        {keywords}
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`w-1.5 h-1.5 rounded-full ${device.is_active ? 'bg-green-400' : 'bg-stone-600'}`}
          />
          <span className="text-stone-400">{device.is_active ? 'Active' : 'Inactive'}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {([['Class', device.class_display_name]] as [string, string][]).map(([label, val]) => (
            <div key={label}>
              <p className="text-stone-500">{label}</p>
              <p className="text-stone-200 font-mono">{val}</p>
            </div>
          ))}
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

  // Track
  return (
    <div className="flex flex-col gap-4 p-3 overflow-y-auto">
      <div>
        <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Track</p>
        <p className="text-sm flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: colorToHex(track!.color) }}
          />
          <span style={{ color: colorToHex(track!.color) }}>{track!.name}</span>
        </p>
      </div>
      {keywords}
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
  const instance = usePluginsStore((s) => s.getInstance(instanceId)) as ActivePlugin<AbletonState>

  const abletonProject = instance.useStore((s) => s.abletonProject) as
    | AbletonProject
    | Record<string, never>
  const selectedTrack = instance.useStore((s) => s.selectedTrack)
  const selectedClipSlot = instance.useStore((s) => s.selectedClipSlot)
  const selectedDevice = instance.useStore((s) => s.selectedDevice)
  const selectedParam = instance.useStore((s) => s.selectedParam)
  const selectedKeyword = instance.useStore((s) => s.selectedKeyword)
  const { setSelectedKeyword } = instance.useStore.getState()

  const project = Object.keys(abletonProject).length > 0 ? (abletonProject as AbletonProject) : null

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

  // Pending keywords live only in local state until they get a valid connection
  const [pendingKeywords, setPendingKeywords] = useState<string[]>([])

  const configKeywords = Object.keys(parsedConfig ?? {})
  const connectedKeywords = configKeywords.filter((k) => parsedConfig![k]?.ableton)
  const unconnectedKeywords = [
    ...configKeywords.filter((k) => !parsedConfig![k]?.ableton),
    ...pendingKeywords.filter((k) => !configKeywords.includes(k))
  ]

  function addKeyword(word: string) {
    const clean = word
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
    if (!clean || !poiesisEntry) return
    const current = poiesisEntry.useStore.getState().parsedConfig ?? {}
    if (current[clean] || pendingKeywords.includes(clean)) return
    // Don't write to config yet — only add to local pending list
    setPendingKeywords((prev) => [...prev, clean])
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

  function writeConfig(updated: ConfigurationJSON) {
    poiesisEntry!.useStore.getState().setConfig(jsyaml.dump(updated, { indent: 2, lineWidth: -1 }))
  }

  function handleSaveConnection(entry: ConfigurationKey) {
    if (!selectedKeyword || !poiesisEntry || !entry.ableton) return
    const current = poiesisEntry.useStore.getState().parsedConfig ?? {}
    writeConfig({ ...current, [selectedKeyword]: entry })
    setPendingKeywords((prev) => prev.filter((k) => k !== selectedKeyword))
  }

  function handleRemoveConnection() {
    if (!selectedKeyword || !poiesisEntry) return
    const current = poiesisEntry.useStore.getState().parsedConfig ?? {}
    const updated = { ...current }
    delete updated[selectedKeyword]
    writeConfig(updated)
    // Move back to pending so the keyword stays visible but unwritten
    setPendingKeywords((prev) =>
      prev.includes(selectedKeyword) ? prev : [...prev, selectedKeyword]
    )
  }

  const hasSelection = !!(selectedTrack || selectedDevice || selectedParam || selectedClipSlot)
  const showForm = !!(selectedKeyword && hasSelection)

  // Keywords whose connection resolves to (or under) the selected object —
  // shown as pills in the object-info pane.
  const selectedLivePath =
    project && selectedTrack
      ? generateLivePath(project, selectedTrack, selectedClipSlot, selectedDevice, selectedParam)
      : null
  const assignedKeywords = useMemo(() => {
    if (!selectedLivePath || !parsedConfig) return []
    const out: { keyword: string; label: string }[] = []
    for (const [kw, entry] of Object.entries(parsedConfig)) {
      const seen = new Set<string>()
      for (const { path, preset } of resolveConnectionPaths(entry)) {
        if (path === selectedLivePath || path.startsWith(selectedLivePath + ' ')) {
          const label = preset ? `${kw}(${preset})` : kw
          if (!seen.has(label)) {
            seen.add(label)
            out.push({ keyword: kw, label })
          }
        }
      }
    }
    return out
  }, [selectedLivePath, parsedConfig])

  const defaultAbleton = project
    ? defaultsForSelection(project, selectedTrack, selectedClipSlot, selectedDevice, selectedParam)
    : null

  // Key resets the ConnectionForm completely whenever keyword or selection changes
  const formKey = `${selectedKeyword}-${selectedTrack?.id ?? ''}-${selectedClipSlot?.id ?? ''}-${selectedDevice?.id ?? ''}-${selectedParam?.id ?? ''}`

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
                  keyConfig={parsedConfig?.[k]}
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
                  keyConfig={parsedConfig?.[k]}
                  project={project}
                  selected={selectedKeyword === k}
                  onClick={() => setSelectedKeyword(selectedKeyword === k ? null : k)}
                />
              ))}
            </div>
          )}

          {connectedKeywords.length === 0 && unconnectedKeywords.length === 0 && (
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
                disabled={!poiesisEntry}
                placeholder={poiesisEntry ? 'Add keyword...' : 'Load a Poiesis plugin first…'}
                title={poiesisEntry ? undefined : 'Keywords are written into the Poiesis config'}
                className={`flex-1 ${inputCls} disabled:opacity-50`}
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
      <div className="flex flex-col w-72 border-r border-stone-700 shrink-0">
        <ColumnHeader>
          <span className={!poiesisEntry ? 'text-stone-600' : ''}>
            {showForm && selectedKeyword ? `"${selectedKeyword}"` : 'Connection'}
          </span>
        </ColumnHeader>
        <div className="flex-1 overflow-y-auto">
          {!poiesisEntry ? (
            <div className="h-full flex items-center justify-center p-4">
              <p className="text-stone-600 text-xs text-center">
                Load a Poiesis plugin to create keyword connections
              </p>
            </div>
          ) : showForm ? (
            <ConnectionForm
              key={formKey}
              keyword={selectedKeyword!}
              existing={parsedConfig?.[selectedKeyword!]}
              defaultAbleton={defaultAbleton}
              onSave={handleSaveConnection}
              onRemove={handleRemoveConnection}
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
            : selectedClipSlot
              ? 'Clip'
              : selectedDevice
                ? 'Device'
                : selectedTrack
                  ? 'Track'
                  : 'Object'}
        </ColumnHeader>
        <div className="flex-1 overflow-y-auto">
          <ObjectInfo
            track={selectedTrack}
            clipSlot={selectedClipSlot}
            device={selectedDevice}
            param={selectedParam}
            keywords={
              assignedKeywords.length > 0 ? (
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {assignedKeywords.map(({ keyword, label }) => (
                      <KeywordPill
                        key={label}
                        keyword={label}
                        keyConfig={parsedConfig?.[keyword]}
                        project={project}
                        selected={selectedKeyword === keyword}
                        onClick={() => setSelectedKeyword(keyword)}
                      />
                    ))}
                  </div>
                </div>
              ) : undefined
            }
          />
        </div>
      </div>
    </div>
  )
}
