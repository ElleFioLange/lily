let ctx: AudioContext | null = null
let instanceCount = 0

export function acquireAudioContext(): AudioContext {
  if (!ctx || ctx.state === 'closed') {
    ctx = new AudioContext()
    instanceCount = 0
  }
  instanceCount++
  return ctx
}

export function releaseAudioContext(): void {
  instanceCount--
  if (instanceCount <= 0 && ctx) {
    ctx.close()
    ctx = null
    instanceCount = 0
  }
}

export function getSharedAudioContext(): AudioContext | null {
  return ctx
}
