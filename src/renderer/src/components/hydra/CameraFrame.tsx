import { useEffect, useRef } from 'react'
import { useHydraPopupStore } from '@renderer/stores/useHydraPopupStore'

export default function CameraFrame() {
  const imgRef = useRef<HTMLImageElement>(null)
  const { latestFrameURL, hydraInstance, isCameraInitialized, initializeCameraSource } =
    useHydraPopupStore()

  // Update image src when frame changes
  useEffect(() => {
    if (!imgRef.current || !latestFrameURL) return
    imgRef.current.src = latestFrameURL
  }, [latestFrameURL])

  // Initialize Hydra source on first valid frame
  useEffect(() => {
    if (!imgRef.current || !hydraInstance || isCameraInitialized) return

    const img = imgRef.current

    img.onload = () => {
      if (img.naturalWidth > 0) {
        try {
          hydraInstance.synth.s0.init({ src: img })
          console.log(
            `Camera initialized as Hydra source s0 (${img.naturalWidth}x${img.naturalHeight})`
          )
          initializeCameraSource()
        } catch (err) {
          console.error('Failed to initialize camera as Hydra source:', err)
        }
      }
    }
  }, [hydraInstance, isCameraInitialized, initializeCameraSource])

  return <img ref={imgRef} alt="" style={{ display: 'none' }} />
}
