import { acquireAudioContext } from './audioContext'
import { createStrudelStore } from './store'
import { createRepl } from './replMap'

export default function init(instanceId: string) {
  acquireAudioContext()
  createRepl(instanceId)
  return createStrudelStore(instanceId)
}
