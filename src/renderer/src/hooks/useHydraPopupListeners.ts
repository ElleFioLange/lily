import { useHydraPopupStore } from '@renderer/stores/useHydraPopupStore'

/**
 * Setup all IPC listeners for the Hydra popup window
 * This should be called once in HydraPopupWindow's useEffect
 */
export function setupHydraPopupListeners(): void {
  const store = useHydraPopupStore.getState()

  // 1. Shader evaluation from main window
  window.api.hydra.onEvaluateShader((code: string) => {
    console.log('Received shader code from main window')
    store.evaluateShader(code)
  })

  // 2. Text updates from main window
  window.api.hydra.onTextUpdate((text: string) => {
    console.log('Received text update from main window')
    store.setText(text)
  })

  // 3. Config updates from main window
  window.api.hydra.onConfigUpdate((config: any) => {
    console.log('Received config update from main window')
    store.setConfig(config)
  })

  // TODO buggy
  // 4. Scroll updates from main window
  window.api.hydra.onScrollUpdate((scrollPercentage: number) => {
    console.log('Received scroll update:', scrollPercentage)
    store.setScrollPercentage(scrollPercentage)
  })

  // 5. Animation triggers from main window
  window.api.hydra.onTriggerAnimation(() => {
    console.log('Received animation trigger from main window')
    store.triggerAnimation()
  })

  // 6. Camera frames
  window.api.camera.onFrame((buffer: ArrayBuffer) => {
    store.updateCameraFrame(buffer)
  })

  // 7. Shader requests from main window (respond with current shader)
  window.api.hydra.onRequestShader(() => {
    console.log('Main window requested shader code')
    const { currentShaderCode } = useHydraPopupStore.getState()
    window.api.hydra.sendShaderResponse(currentShaderCode)
  })

  // 8. Config requests from main window (respond with current config)
  window.api.hydra.onRequestConfig(() => {
    console.log('Main window requested config')
    const { config } = useHydraPopupStore.getState()
    if (config) {
      window.api.hydra.sendConfigUpdate(config)
    }
  })

  console.log('Hydra popup IPC listeners setup complete')
}
