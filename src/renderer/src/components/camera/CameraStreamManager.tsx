import { useEffect, useRef } from 'react'
import { useCameraStore } from '../../stores/useCameraStore'

interface CameraStreamManagerProps {
  onVideoReady?: (video: HTMLVideoElement) => void
  visible?: boolean
}

/**
 * Manages the video element for camera streaming
 * Converts incoming JPEG frames from the WebSocket to a video element
 * that can be used as a source for Hydra
 */
export function CameraStreamManager({ onVideoReady, visible = false }: CameraStreamManagerProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const latestFrameURL = useCameraStore((state) => state.latestFrameURL)

  // Update image source when new frame arrives
  useEffect(() => {
    if (imgRef.current && latestFrameURL) {
      imgRef.current.src = latestFrameURL
    }
  }, [latestFrameURL])

  // Call the callback when video element is ready
  useEffect(() => {
    if (imgRef.current && onVideoReady) {
      onVideoReady(imgRef.current as unknown as HTMLVideoElement)
    }
  }, [onVideoReady])

  // Cleanup: video element will be automatically cleaned up by React
  // Blob URLs are revoked in the store when stopServer is called

  return (
    <img
      ref={imgRef}
      style={{
        display: visible ? 'block' : 'none',
        width: visible ? 'auto' : '1px',
        height: visible ? 'auto' : '1px',
        objectFit: 'contain'
      }}
      alt="Camera stream"
    />
  )
}
