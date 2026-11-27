import { useEffect } from 'react'
import { useGraphicsStore } from '@renderer/stores/useGraphicsStore'
import { usePerformanceStore } from '@renderer/stores/usePerformanceStore'
import Stage from './Stage'

/**
 * Cmd+Shift+O: covers the control center with the live mix exactly as the performance window
 * shows it. The panels stay mounted underneath so every layer keeps running. Esc also exits.
 */
export default function FullPreview() {
  const { fullPreview, setFullPreview } = usePerformanceStore()
  const { compositorRef, editors, editorsOrder } = useGraphicsStore()

  useEffect(() => {
    if (!fullPreview) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullPreview(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullPreview, setFullPreview])

  if (!fullPreview) return null

  return (
    <div className="fixed inset-0 z-50 bg-black group" aria-label="Performance preview">
      <Stage
        compositor={compositorRef}
        outputId="program-full"
        editors={editors}
        editorsOrder={editorsOrder}
        environment="preview"
      />
      <button
        className="absolute top-3 right-3 text-xs bg-stone-900/80 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => setFullPreview(false)}
        title="Back to the control center (Cmd+Shift+O or Esc)"
      >
        exit preview · ⌘⇧O
      </button>
    </div>
  )
}
