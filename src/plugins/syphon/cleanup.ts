export default function cleanup(instanceId: string): void {
  window.api.syphon.disconnect(instanceId)
  console.log('[Syphon] plugin cleaned up:', instanceId)
}
