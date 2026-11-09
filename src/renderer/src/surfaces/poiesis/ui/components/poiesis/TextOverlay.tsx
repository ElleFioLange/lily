import { useEffect, useRef, type ReactNode } from 'react'
import { keyRegex } from '@renderer/utils/parseInput'
import KeywordRenderer from './KeywordRenderer'
import { ActivePlugin } from '@plugins/utils'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { PoiesisState } from '@renderer/surfaces/poiesis/store'

type TextOverlayProps = {
  instanceId: string
  environment: 'performance' | 'preview'
}

export default function TextOverlay({ instanceId, environment }: TextOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<PoiesisState>
  const { poiesis, parsedConfig, scrollPercentage, shaderManager } = instance.useStore()

  // Handle scroll updates
  useEffect(() => {
    if (!overlayRef.current) return
    const overlay = overlayRef.current
    const maxScroll = overlay.scrollHeight + overlay.clientHeight
    const targetScroll = maxScroll * scrollPercentage
    overlay.scrollTop = targetScroll
  }, [scrollPercentage])

  // Handle animation trigger
  // useEffect(() => {
  //   if (!triggerAnimationFlag || !overlayRef.current) return

  //   const overlay = overlayRef.current
  //   // Reset animation
  //   overlay.style.animation = 'none'
  //   // Force reflow to restart animation
  //   void overlay.offsetHeight
  //   // Apply animation
  //   overlay.style.animation = '2s 0s ease-out 1 trigger'

  //   // Reset the flag
  //   resetAnimationFlag()
  // }, [triggerAnimationFlag, resetAnimationFlag])

  // Parse text and render content
  const renderContent = () => {
    if (!parsedConfig) {
      // No parsedConfig - return plain text
      return poiesis
    }

    const keys = Object.keys(parsedConfig)
    const matchedKeys: Array<{
      key: string
      match: string
      position: { start: number; end: number }
    }> = []

    // Find all keyword matches
    keys.forEach((key) => {
      console.log('matching keys')
      const regex = keyRegex(key)
      const matches = poiesis.matchAll(regex)
      Array.from(matches).forEach((instance) => {
        const match = instance[0]
        const start = instance.index!
        const end = start + match.length
        matchedKeys.push({ key, match, position: { start, end } })
      })
    })

    // Sort by position
    matchedKeys.sort((a, b) => a.position.start - b.position.start)

    // Build content with keyword components
    const elements: ReactNode[] = []
    let marker = 0

    matchedKeys.forEach(({ key, match, position }, index) => {
      const { start, end } = position

      // Add text before keyword
      if (start > marker) {
        elements.push(
          <span key={`text-${index}`} className="bg-stone-800/25">
            {poiesis.slice(marker, start)}
          </span>
        )
      }

      // Add keyword renderer or plain keyword
      // Keyword shaders are registered by keyword name on the shared shader manager, so the
      // preview renders plain keywords to avoid clobbering the performance window's shaders.
      const keywordConfig = parsedConfig[key]
      if (keywordConfig.audio_reactivity && environment === 'performance') {
        elements.push(
          <KeywordRenderer
            key={`keyword-${key}-${index}`}
            keyword={key}
            text={match}
            audioConfig={keywordConfig.audio_reactivity}
            shaderManager={shaderManager}
          />
        )
      } else {
        elements.push(
          <span key={`keyword-${key}-${index}`} id={key} className="keyword">
            {match}
          </span>
        )
      }

      marker = end
    })

    // Add remaining text
    if (marker < poiesis.length) {
      elements.push(<span key="text-end">{poiesis.slice(marker)}</span>)
    }

    return elements
  }

  return (
    <div
      id="text-overlay-container"
      className="absolute top-0 left-0 right-0 bottom-0 flex items-center"
    >
      <div
        ref={overlayRef}
        id="text-overlay"
        className="w-full max-h-full overflow-y-auto text-center text-5xl pointer-events-none z-10 p-8 wrap-break-word whitespace-pre-wrap leading-[115%]"
      >
        {renderContent()}
      </div>
    </div>
  )
}
