import { create } from 'zustand'
import { useSourcesStore } from './useSourcesStore'
import { MixerParams, useGraphicsStore } from './useGraphicsStore'
import { MixSnapshot, MixerPreset, mergeOrder, useMixerPresetsStore } from './useMixerPresetsStore'
import { useWorkingDirectoryStore } from './useWorkingDirectoryStore'
import { baseName, isRecord, num, str } from '@renderer/sources/session'
import run from '@renderer/utils/actions/run'
import { v4 as uuid } from 'uuid'

/**
 * A .lly session file: every open layer (with its patch text as it stands, saved or not),
 * the mixer, its presets, and the working directory. JSON, so it diffs and hand-edits fine.
 *
 * Layers are keyed "layer-1", "layer-2"... in the file, and the mixer refers to those keys,
 * since instance ids are new every time Lily starts.
 */
const FORMAT = 'lily-session'
const VERSION = 1

type LlyLayer = { id: string; source: string; name: string; data?: unknown }
type LlyMix = MixSnapshot
type LlyFile = {
  format: typeof FORMAT
  version: number
  workingDirectory: string | null
  focused: string | null
  layers: LlyLayer[]
  mixer: LlyMix
  presets: (LlyMix & { name: string })[]
  fadeSeconds: number
}

/** Rewrites a mix's ids through a map, dropping ids the map doesn't know. */
function remapMix(mix: MixSnapshot, map: (id: string) => string | undefined): MixSnapshot {
  const params = (record: Record<string, MixerParams>) =>
    Object.fromEntries(
      Object.entries(record).flatMap(([id, value]) => {
        const mapped = map(id)
        return mapped ? [[mapped, value]] : []
      })
    )
  const order = (ids: string[]) => ids.map(map).filter((id): id is string => id !== undefined)
  return {
    graphics: params(mix.graphics),
    editors: params(mix.editors),
    graphicsOrder: order(mix.graphicsOrder),
    editorsOrder: order(mix.editorsOrder)
  }
}

/** Reads a mix from untrusted file data, keeping only well-formed params. */
function readMix(value: unknown): MixSnapshot {
  const mix = isRecord(value) ? value : {}
  const params = (record: unknown) =>
    Object.fromEntries(
      Object.entries(isRecord(record) ? record : {}).flatMap(([id, p]) => {
        if (!isRecord(p)) return []
        const alpha = num(p.alpha)
        const blendMode = str(p.blendMode)
        const clean: Partial<MixerParams> = {
          ...(alpha !== undefined && { alpha: Math.min(1, Math.max(0, alpha)) }),
          ...(blendMode !== undefined && { blendMode }),
          ...(typeof p.enabled === 'boolean' && { enabled: p.enabled })
        }
        return [[id, clean]]
      })
    ) as Record<string, MixerParams>
  const order = (ids: unknown) =>
    Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []
  return {
    graphics: params(mix.graphics),
    editors: params(mix.editors),
    graphicsOrder: order(mix.graphicsOrder),
    editorsOrder: order(mix.editorsOrder)
  }
}

export function serializeSession(): LlyFile {
  const { active, focused } = useSourcesStore.getState()
  const live = useGraphicsStore.getState()
  const { presets, fadeSeconds } = useMixerPresetsStore.getState()

  const fileIds = new Map<string, string>()
  const layers: LlyLayer[] = Object.values(active).map((source, i) => {
    const id = `layer-${i + 1}`
    fileIds.set(source.instanceId, id)
    return {
      id,
      source: source.manifest.id,
      name: source.name,
      data: source.serialize?.(source.instanceId)
    }
  })
  const toFile = (instanceId: string) => fileIds.get(instanceId)

  return {
    format: FORMAT,
    version: VERSION,
    workingDirectory: useWorkingDirectoryStore.getState().directory,
    focused: focused ? (toFile(focused) ?? null) : null,
    layers,
    mixer: remapMix(live, toFile),
    presets: presets.map(({ name, ...mix }) => ({ name, ...remapMix(mix, toFile) })),
    fadeSeconds
  }
}

/** Replaces the current session with one read from a .lly file. Throws if it isn't one. */
export async function restoreSession(content: string): Promise<void> {
  const file: unknown = JSON.parse(content)
  if (!isRecord(file) || file.format !== FORMAT) throw new Error('Not a Lily session file')
  if ((num(file.version) ?? 0) > VERSION) {
    throw new Error('This session was saved by a newer version of Lily')
  }

  const sources = useSourcesStore.getState()
  useMixerPresetsStore.getState().cancelFade()

  // Close every layer that can be closed; pinned layers (Poiesis) are reused
  Object.values(sources.active)
    .filter((source) => !source.manifest.pinned)
    .forEach((source) => sources.unloadSource(source.instanceId))

  const instanceIds = new Map<string, string>()
  const layers = Array.isArray(file.layers) ? file.layers.filter(isRecord) : []
  for (const layer of layers) {
    const fileId = str(layer.id)
    const sourceId = str(layer.source)
    if (!fileId || !sourceId) continue
    const definition = useSourcesStore.getState().registered[sourceId]
    if (!definition) continue // e.g. Poiesis in a build without it

    const instanceId = definition.manifest.pinned
      ? Object.values(useSourcesStore.getState().active).find((s) => s.manifest.id === sourceId)
          ?.instanceId
      : useSourcesStore.getState().loadSource(sourceId)
    if (!instanceId) continue

    instanceIds.set(fileId, instanceId)
    const name = str(layer.name)
    if (name) useSourcesStore.getState().renameLayer(instanceId, name)
    definition.restore?.(instanceId, layer.data)
  }

  // Always leave at least one Hydra layer to work in
  if (!Object.values(useSourcesStore.getState().active).some((s) => s.manifest.id === 'hydra')) {
    useSourcesStore.getState().addLayer()
  }

  const toInstance = (fileId: string) => instanceIds.get(fileId)

  // Mixer: apply each layer's params, then the saved order (new layers keep their place after)
  const mix = remapMix(readMix(file.mixer), toInstance)
  const live = useGraphicsStore.getState()
  for (const type of ['graphics', 'editors'] as const) {
    for (const [id, params] of Object.entries(mix[type])) {
      if (live[type][id] !== undefined) live.updateParams(id, type, params)
    }
    const orderKey = type === 'graphics' ? 'graphicsOrder' : 'editorsOrder'
    live.setOrder(type, mergeOrder(mix[orderKey], useGraphicsStore.getState()[orderKey]))
  }

  // Presets
  const presets: MixerPreset[] = (Array.isArray(file.presets) ? file.presets : [])
    .filter(isRecord)
    .map((preset, i) => ({
      id: uuid(),
      name: str(preset.name) ?? `preset ${i + 1}`,
      ...remapMix(readMix(preset), toInstance)
    }))
  const fadeSeconds = num(file.fadeSeconds)
  useMixerPresetsStore.setState({
    presets,
    ...(fadeSeconds !== undefined && { fadeSeconds: Math.max(0, fadeSeconds) })
  })

  const workingDirectory = str(file.workingDirectory)
  if (workingDirectory) await useWorkingDirectoryStore.getState().setDirectory(workingDirectory)

  const focused = str(file.focused)
  const focusedId = focused ? toInstance(focused) : undefined
  const fallback = Object.values(useSourcesStore.getState().active).find(
    (s) => s.manifest.id === 'hydra'
  )?.instanceId
  useSourcesStore.getState().setFocused(focusedId ?? fallback ?? null)

  // Start every layer's patch so the session comes back running
  run()
}

interface SessionState {
  /** Where the current session was last saved or opened from */
  path: string | null
  open: () => Promise<void>
  save: () => Promise<void>
  saveAs: () => Promise<void>
}

const setTitle = (path: string | null) => {
  document.title = path ? `${baseName(path)} · Lily` : 'Lily'
}

export const useSessionStore = create<SessionState>((set, get) => ({
  path: null,

  open: async () => {
    const { success, content, path, error } = await window.api.session.open()
    if (!success || content === undefined || !path) {
      if (error && error !== 'No file selected') console.error(error)
      return
    }
    try {
      await restoreSession(content)
      set({ path })
      setTitle(path)
    } catch (err) {
      console.error('[session] Failed to open', err)
      alert(`Couldn't open ${baseName(path)}.lly: ${err instanceof Error ? err.message : err}`)
    }
  },

  save: async () => {
    const { path } = get()
    if (!path) return get().saveAs()
    const content = JSON.stringify(serializeSession(), null, 2)
    const result = await window.api.session.write(content, path)
    if (!result.success) alert(`Couldn't save the session: ${result.error}`)
  },

  saveAs: async () => {
    const { path } = get()
    const content = JSON.stringify(serializeSession(), null, 2)
    const result = await window.api.session.saveAs(
      content,
      path ? `${baseName(path)}.lly` : undefined
    )
    if (result.success && result.path) {
      set({ path: result.path })
      setTitle(result.path)
      void useWorkingDirectoryStore.getState().refresh()
    }
  }
}))
