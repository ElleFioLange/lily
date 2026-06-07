import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin } from '@plugins/utils'
import { StrudelState } from './store'
import { releaseAudioContext } from './audioContext'
import { getRepl, removeRepl } from './replMap'

export default function cleanup(instanceId: string) {
  const repl = getRepl(instanceId)
  if (repl) {
    try {
      repl.stop()
    } catch (e) {
      console.warn('[Strudel] Error stopping repl on cleanup:', e)
    }
    removeRepl(instanceId)
  }

  const { getInstance } = usePluginsStore.getState()
  const instance = getInstance(instanceId) as ActivePlugin<StrudelState>
  if (instance) {
    instance.useStore.getState().setIsPlaying(false)
  }

  releaseAudioContext()
}
