import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePerformanceStore } from '../../stores/usePerformanceStore'
// import HydraPlugin from '@plugins/hydra'
// import PoiesisRenderer from '../../surfaces/poiesis/ui/Renderer'
import { useGraphicsStore } from '@renderer/stores/useGraphicsStore'

/**
 * PerformanceWindow renders a full-screen compositor canvas into a child window.
 * Uses React Portal to render into the child window's document body.
 * The child window runs in the same renderer process, sharing all stores.
 */
export function PerformanceWindow() {
  const { isOpen, closeWindow, setWindowRef } = usePerformanceStore()
  const { addOutput, startRenderLoop } = useGraphicsStore()
  const [childWindow, setChildWindow] = useState<Window | null>(null)
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Open window when isOpen becomes true
  useEffect(() => {
    if (!isOpen) {
      // Clean up if window was open
      if (childWindow && !childWindow.closed) {
        childWindow.close()
      }
      setChildWindow(null)
      setContainer(null)
      return
    }

    // Open the performance window
    const win = window.open('', 'performance', 'width=1920,height=1080')
    if (!win) {
      console.error('Failed to open performance window')
      closeWindow()
      return
    }

    // Set up minimal document styling
    win.document.title = 'Performance'
    win.document.body.style.margin = '0'
    win.document.body.style.padding = '0'
    win.document.body.style.overflow = 'hidden'
    win.document.body.style.backgroundColor = '#000'
    win.document.body.style.width = '100vw'
    win.document.body.style.height = '100vh'

    // Copy stylesheets from parent window to child window
    Array.from(document.styleSheets).forEach((stylesheet) => {
      try {
        if (stylesheet.href) {
          // External stylesheet - create link element
          const link = win.document.createElement('link')
          link.rel = 'stylesheet'
          link.href = stylesheet.href
          win.document.head.appendChild(link)
        } else if (stylesheet.cssRules) {
          // Inline stylesheet - copy rules
          const style = win.document.createElement('style')
          Array.from(stylesheet.cssRules).forEach((rule) => {
            style.appendChild(win.document.createTextNode(rule.cssText))
          })
          win.document.head.appendChild(style)
        }
      } catch (e) {
        console.warn('Could not copy stylesheet:', e)
      }
    })

    setChildWindow(win)
    setWindowRef(win)
    setContainer(win.document.body)

    // Handle window close by user
    const handleBeforeUnload = (): void => {
      closeWindow()
    }
    win.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      win.removeEventListener('beforeunload', handleBeforeUnload)
      if (!win.closed) {
        win.close()
      }
      setWindowRef(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, closeWindow, setWindowRef])

  // Initialize compositor when canvas is ready
  useEffect(() => {
    if (!childWindow || !container) return

    const outputId = 'performance'

    // Wait for next frame to ensure canvas is mounted
    const timeoutId = setTimeout(() => {
      const canvas = container.querySelector('canvas') as HTMLCanvasElement | null
      if (!canvas) {
        console.error('Canvas not found in performance window')
        return
      }

      // Set canvas size to match window
      canvas.width = childWindow.innerWidth
      canvas.height = childWindow.innerHeight

      addOutput({ id: outputId, canvas, window })
      startRenderLoop(outputId)

      // Handle resize
      const handleResize = (): void => {
        canvas.width = childWindow.innerWidth
        canvas.height = childWindow.innerHeight
      }
      childWindow.addEventListener('resize', handleResize)

      return () => {
        childWindow.removeEventListener('resize', handleResize)
      }
    }, 0)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [addOutput, childWindow, container, startRenderLoop])

  // Don't render if not open or container not ready
  if (!isOpen || !container) return null

  // Render canvas into child window via portal
  return createPortal(
    // <Workspace />,
    // <div style={{ width: '100%', height: '100%', position: 'relative' }}>
    //   <div style={{ width: '100%', height: '100%', position: 'absolute' }}>
    //     {HydraPlugin.Renderer && <HydraPlugin.Renderer />}
    //   </div>
    //   <div style={{ width: '100%', height: '100%', position: 'absolute' }}>
    //     <PoiesisRenderer />
    //   </div>
    // </div>,
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block'
      }}
    />,
    container
  )
}
