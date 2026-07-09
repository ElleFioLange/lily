import { destroyControlClient } from './ws'

export default function cleanup(instanceId: string): void {
  window.api.syphon.disconnect(instanceId)
  destroyControlClient(instanceId)
  console.log('[Operator] plugin cleaned up:', instanceId)
}
