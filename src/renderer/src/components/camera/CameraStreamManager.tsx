import { useEffect, useRef, useState } from 'react'
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
  const [isImageReady, setIsImageReady] = useState(false)
  const latestFrameURL = useCameraStore((state) => state.latestFrameURL)

  // Update image source when new frame arrives
  useEffect(() => {
    if (imgRef.current && latestFrameURL) {
      imgRef.current.src = latestFrameURL
    }
  }, [latestFrameURL])

  // Wait for the first image to load before notifying Hydra
  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    const handleLoad = () => {
      // Only set ready once we have a valid image with dimensions
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        console.log(`Image loaded: ${img.naturalWidth}x${img.naturalHeight}`)
        setIsImageReady(true)
      }
    }

    img.addEventListener('load', handleLoad)

    // Check if image is already loaded
    if (img.complete && img.naturalWidth > 0) {
      handleLoad()
    }

    return () => {
      img.removeEventListener('load', handleLoad)
    }
  }, [])

  // Call the callback when image is ready with valid dimensions
  useEffect(() => {
    if (imgRef.current && isImageReady && onVideoReady) {
      console.log('Notifying Hydra that camera source is ready')
      onVideoReady(imgRef.current as unknown as HTMLVideoElement)
    }
  }, [isImageReady, onVideoReady])

  // Cleanup: video element will be automatically cleaned up by React
  // Blob URLs are revoked in the store when stopServer is called

  return (
    <img
      ref={imgRef}
      style={{
        display: visible ? 'block' : 'none',
        // Keep natural dimensions even when hidden to avoid texture errors
        objectFit: 'contain'
      }}
      alt="Camera stream"
    />
  )
}
