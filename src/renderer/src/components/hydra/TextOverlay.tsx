import { useEffect, useRef, type ReactNode } from 'react'
import { useHydraPopupStore } from '@renderer/stores/useHydraPopupStore'
import { keyRegex } from '@renderer/utils/parseInput'
import KeywordRenderer from './KeywordRenderer'

export default function TextOverlay() {
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const { currentText, config, scrollPercentage, triggerAnimationFlag, resetAnimationFlag } =
    useHydraPopupStore()

  // Handle scroll updates
  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const maxScroll = container.scrollHeight - container.clientHeight
    const targetScroll = maxScroll * scrollPercentage
    container.scrollTop = targetScroll
  }, [scrollPercentage])

  // Handle animation trigger
  useEffect(() => {
    if (!triggerAnimationFlag || !overlayRef.current) return

    const overlay = overlayRef.current
    // Reset animation
    overlay.style.animation = 'none'
    // Force reflow to restart animation
    void overlay.offsetHeight
    // Apply animation
    overlay.style.animation = '2s 0s ease-out 1 trigger'

    // Reset the flag
    resetAnimationFlag()
  }, [triggerAnimationFlag, resetAnimationFlag])

  // Parse text and render content
  const renderContent = () => {
    if (!config) {
      // No config - return plain text
      return currentText
    }

    const keys = Object.keys(config)
    const matchedKeys: Array<{
      key: string
      match: string
      position: { start: number; end: number }
    }> = []

    // Find all keyword matches
    keys.forEach((key) => {
      const regex = keyRegex(key)
      const matches = currentText.matchAll(regex)
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
        elements.push(<span key={`text-${index}`}>{currentText.slice(marker, start)}</span>)
      }

      // Add keyword renderer or plain keyword
      const keywordConfig = config[key]
      if (keywordConfig.audio_reactivity) {
        elements.push(
          <KeywordRenderer
            key={`keyword-${key}-${index}`}
            keyword={key}
            text={match}
            audioConfig={keywordConfig.audio_reactivity}
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
    if (marker < currentText.length) {
      elements.push(<span key="text-end">{currentText.slice(marker)}</span>)
    }

    return elements
  }

  return (
    <div
      ref={containerRef}
      id="text-overlay-container"
      className="absolute top-0 left-0 right-0 bottom-0 overflow-auto flex justify-center items-center"
    >
      <div
        ref={overlayRef}
        id="text-overlay"
        className="text-center text-5xl pointer-events-none z-10 p-8 wrap-break-word whitespace-pre-wrap leading-[115%]"
      >
        {renderContent()}
      </div>
    </div>
  )
}
