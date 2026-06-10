import { useRef, useEffect, useState } from 'react'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin } from '@plugins/utils'
import { StrudelState } from '../store'
import { getRepl, getPattern } from '../replMap'
import { UIProps } from 'src/types/plugins'
// @ts-ignore — no types for @strudel/draw
import { __pianoroll } from '@strudel/draw/pianoroll.mjs'
// @ts-ignore — superdough types not available
import { analysers } from 'superdough'

type Tab = 'scope' | 'roll' | 'info'

// ─── Scope canvas ────────────────────────────────────────────────────────────

function ScopeCanvas({ instanceId: _instanceId }: { instanceId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId: number

    const draw = () => {
      rafId = requestAnimationFrame(draw)
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      const analyser: AnalyserNode | undefined = analysers[1]

      ctx.strokeStyle = '#6ee7b7'
      ctx.lineWidth = 1.5
      ctx.beginPath()

      if (!analyser) {
        // flat line while idle
        ctx.moveTo(0, h / 2)
        ctx.lineTo(w, h / 2)
        ctx.stroke()
        return
      }

      const data = new Float32Array(analyser.frequencyBinCount)
      analyser.getFloatTimeDomainData(data)

      // zero-crossing trigger for stable display
      let start = 0
      for (let i = 1; i < data.length; i++) {
        if (data[i - 1] < 0 && data[i] >= 0) {
          start = i
          break
        }
      }

      const step = w / (data.length - start)
      for (let i = start; i < data.length; i++) {
        const x = (i - start) * step
        const y = (0.5 - data[i] * 0.4) * h
        i === start ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    draw()
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div className="size-full flex flex-col">
      <canvas ref={canvasRef} width={400} height={120} className="w-full h-full" />
      <p className="text-stone-600 text-xs font-mono text-center pb-1">
        add <span className="text-stone-400">.scope()</span> to enable
      </p>
    </div>
  )
}

// ─── Pianoroll canvas ─────────────────────────────────────────────────────────

function PianorollCanvas({ instanceId }: { instanceId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId: number

    const draw = () => {
      rafId = requestAnimationFrame(draw)
      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      const pattern = getPattern(instanceId)
      const repl = getRepl(instanceId)
      if (!pattern || !repl) return

      const cycles = 4
      const playhead = 0.5
      const time = repl.scheduler.now()
      const from = time - cycles * playhead
      const to = time + cycles * (1 - playhead)

      let haps: unknown[]
      try {
        haps = pattern.queryArc(from, to)
      } catch {
        return
      }

      try {
        __pianoroll({
          ctx,
          haps,
          time,
          cycles,
          playhead,
          autorange: 1,
          background: 'transparent',
          inactive: '#57534e',
          active: '#6ee7b7',
          playheadColor: '#6ee7b7'
        })
      } catch {
        // pattern may not have note values
      }
    }

    draw()
    return () => cancelAnimationFrame(rafId)
  }, [instanceId])

  return <canvas ref={canvasRef} width={400} height={150} className="w-full h-full" />
}

// ─── Monitor root ─────────────────────────────────────────────────────────────

export default function Monitor({ instanceId }: UIProps) {
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<StrudelState>
  const { isPlaying, bpm, error } = instance.useStore()
  const [tab, setTab] = useState<Tab>('scope')

  return (
    <div className="size-full flex flex-col font-mono text-xs">
      {/* Tab bar */}
      <div className="flex border-b border-stone-700 shrink-0">
        {(['scope', 'roll', 'info'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 text-xs ${tab === t ? 'text-stone-100 border-b border-stone-100' : 'text-stone-500 hover:text-stone-300'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {tab === 'scope' && <ScopeCanvas instanceId={instanceId} />}
        {tab === 'roll' && <PianorollCanvas instanceId={instanceId} />}
        {tab === 'info' && (
          <div className="p-4 flex flex-col gap-3 text-stone-300">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${isPlaying ? 'bg-emerald-400' : 'bg-stone-600'}`}
              />
              <span className="text-stone-400">{isPlaying ? 'playing' : 'stopped'}</span>
            </div>
            <div>
              <span className="text-stone-500">bpm </span>
              <span>{bpm}</span>
            </div>
            {error && <div className="text-rose-400 break-all">{error}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
