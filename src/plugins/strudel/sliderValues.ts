import { signal } from '@strudel/core'

const sliderValues = new Map<string, number>()

export function getSliderValue(id: string): number | undefined {
  return sliderValues.get(id)
}

export function setSliderValue(id: string, value: number): void {
  sliderValues.set(id, value)
}

export function clearSliders(ids: string[]): void {
  for (const id of ids) sliderValues.delete(id)
}

/**
 * Injected into globalThis during prebake so that the transpiler's
 * sliderWithID(id, initial, min, max, step) calls work in user code.
 * Returns a continuous signal Pattern that reads the live slider value.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sliderWithID(id: string, initial: number, _min = 0, _max = 1, _step?: number): any {
  if (!sliderValues.has(id)) {
    sliderValues.set(id, Number(initial))
  }
  return signal(() => sliderValues.get(id) ?? Number(initial))
}
