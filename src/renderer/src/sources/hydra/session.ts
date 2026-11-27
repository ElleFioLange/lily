import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { ActiveSource } from '@renderer/sources/types'
import { baseName, isRecord, num, str } from '@renderer/sources/session'
import { HydraState } from './store'

const getStore = (instanceId: string) =>
  (useSourcesStore.getState().getInstance(instanceId) as ActiveSource<HydraState> | undefined)
    ?.useStore

/** A Hydra layer in a .lly file: the patch text as it stands (saved or not) and its controls. */
export function serialize(instanceId: string) {
  const state = getStore(instanceId)?.getState()
  if (!state) return undefined
  const { shader, shaderPath, speed, performanceText } = state
  return { shader, shaderPath, speed, performanceText }
}

export function restore(instanceId: string, data: unknown): void {
  const useStore = getStore(instanceId)
  if (!useStore || !isRecord(data)) return
  const { setSpeed, setPerformanceText } = useStore.getState()

  const shaderPath = str(data.shaderPath) ?? null
  useStore.setState({
    shader: str(data.shader) ?? '',
    shaderPath,
    shaderName: shaderPath ? baseName(shaderPath) : 'new-shader',
    isValid: true,
    error: null
  })

  const speed = num(data.speed)
  if (speed !== undefined) setSpeed(speed)

  if (isRecord(data.performanceText)) {
    const { fontSize, x, y } = data.performanceText
    setPerformanceText({
      ...(num(fontSize) !== undefined && { fontSize: num(fontSize) }),
      ...(num(x) !== undefined && { x: num(x) }),
      ...(num(y) !== undefined && { y: num(y) })
    })
  }
}
