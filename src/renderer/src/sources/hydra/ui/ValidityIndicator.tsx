import { useEffect, useState } from 'react'
import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { ActiveSource } from '@renderer/sources/types'
import { HydraState } from '../store'
import { useValidationFlash } from '../validate'

// How long the indicator stands out after evaluating code that won't run
const FLASH_MS = 4000

/**
 * The editor's top-left status, in a strip above the first line: a faint dot while the code would run, and an amber dot with the
 * error in small, dim text while it wouldn't. It updates as you type, so it stays quiet while code
 * is half written. Evaluating code that won't run makes it stand out, with the whole message, for
 * a few seconds.
 */
export default function ValidityIndicator({ instanceId }: { instanceId: string }) {
  const instance = useSourcesStore((state) => state.active[instanceId]) as
    | ActiveSource<HydraState>
    | undefined
  const isValid = instance?.useStore((state) => state.isValid) ?? true
  const error = instance?.useStore((state) => state.error) ?? null
  const flashAt = useValidationFlash((state) => (state.instanceId === instanceId ? state.at : 0))
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!flashAt) return
    setNow(Date.now())
    const timer = window.setTimeout(() => setNow(Date.now()), FLASH_MS)
    return () => window.clearTimeout(timer)
  }, [flashAt])

  if (!instance) return null
  const failing = !isValid && error
  const loud = failing && now - flashAt < FLASH_MS

  return (
    <div
      className={`absolute left-1.5 top-0.5 z-10 flex items-start gap-1.5 pointer-events-none font-neon ${loud ? 'max-w-[80%]' : 'max-w-[45%]'}`}
      role="status"
      aria-label={failing ? `Won't run: ${error}` : 'Code runs'}
    >
      <span
        className={`mt-1 size-2 shrink-0 rounded-full ${failing ? (loud ? 'bg-rose-500 animate-pulse' : 'bg-amber-400/70') : 'bg-emerald-400/40'}`}
      />
      {failing ? (
        <span
          className={
            loud
              ? 'text-xs leading-4 px-1.5 py-0.5 bg-rose-950/90 text-rose-100 border border-rose-500/70 whitespace-pre-wrap break-words'
              : 'text-[10px] leading-4 px-1 bg-stone-950/40 text-amber-200/60 truncate'
          }
        >
          {error}
        </span>
      ) : null}
    </div>
  )
}
