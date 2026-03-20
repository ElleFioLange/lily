import { KeywordShaderManager } from '@renderer/surfaces/poiesis/lib/KeywordShaderManager'
import { useEffect, useRef } from 'react'
import type { AudioReactivityConfig } from 'src/types/config'

interface KeywordRendererProps {
  keyword: string
  text: string
  audioConfig: AudioReactivityConfig
  shaderManager: KeywordShaderManager | null
}

export default function KeywordRenderer({
  keyword,
  text,
  audioConfig,
  shaderManager
}: KeywordRendererProps) {
  const textSpanRef = useRef<HTMLSpanElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!textSpanRef.current || !canvasRef.current || !shaderManager) return

    const canvas = canvasRef.current
    const textSpan = textSpanRef.current

    // Wait for fonts to load, then measure and create shader
    document.fonts.ready.then(() => {
      requestAnimationFrame(() => {
        const bounds = textSpan.getBoundingClientRect()
        if (bounds.width > 0 && bounds.height > 0) {
          // Size canvas to match text with device pixel ratio
          const dpr = window.devicePixelRatio || 1
          canvas.width = Math.ceil(bounds.width * dpr)
          canvas.height = Math.ceil(bounds.height * dpr)
          canvas.style.width = `${bounds.width}px`
          canvas.style.height = `${bounds.height}px`

          // Create shader instance
          shaderManager.createKeywordShader(keyword, canvas, audioConfig, text)
        }
      })
    })

    return () => {
      // Cleanup shader instance on unmount
      shaderManager?.removeKeywordShader(keyword)
    }
  }, [keyword, text, audioConfig, shaderManager])

  return (
    <span id={keyword} className="keyword-container">
      <span ref={textSpanRef} className="keyword-text">
        {text}
      </span>
      <canvas ref={canvasRef} className="keyword-shader" data-keyword={keyword} />
    </span>
  )
}
