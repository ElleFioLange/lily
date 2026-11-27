import { create } from 'zustand'
import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { ActiveSource } from '@renderer/sources/types'
import { HydraState } from './store'

/** Open Hydra patches in tab order; the controls panel numbers them 1, 2, 3... */
export function hydraLayers(
  active = useSourcesStore.getState().active
): ActiveSource<HydraState>[] {
  return Object.values(active).filter(
    (source) => source.manifest.id === 'hydra'
  ) as ActiveSource<HydraState>[]
}

interface ControlTargetsState {
  /** Patches the controls also set, besides the focused one */
  selected: string[]
  toggle: (instanceId: string) => void
  selectAll: () => void
  /** Back to controlling only the focused patch */
  clear: () => void
}

/**
 * Which patches the controls panel sets. The focused patch is always one of them; clicking
 * another patch's number adds or removes it. Selecting a patch doesn't change it: the controls
 * show the focused patch's values, and moving one sets that value on every selected patch.
 */
export const useControlTargets = create<ControlTargetsState>((set, get) => ({
  selected: [],
  toggle: (instanceId) => {
    const { selected } = get()
    set({
      selected: selected.includes(instanceId)
        ? selected.filter((id) => id !== instanceId)
        : [...selected, instanceId]
    })
  },
  selectAll: () => set({ selected: hydraLayers().map(({ instanceId }) => instanceId) }),
  clear: () => set({ selected: [] })
}))

/** The patches a control change applies to: the focused one, then the other selected ones */
export function controlTargets(focusedId: string): ActiveSource<HydraState>[] {
  const { selected } = useControlTargets.getState()
  return hydraLayers().filter(
    ({ instanceId }) => instanceId === focusedId || selected.includes(instanceId)
  )
}

/** Sets something on every patch the controls apply to */
export function setOnTargets(focusedId: string, update: (state: HydraState) => void): void {
  for (const target of controlTargets(focusedId)) update(target.useStore.getState())
}

// Forget closed patches, so a new patch never starts out selected
useSourcesStore.subscribe(({ active }) => {
  const { selected } = useControlTargets.getState()
  const open = selected.filter((id) => id in active)
  if (open.length !== selected.length) useControlTargets.setState({ selected: open })
})
