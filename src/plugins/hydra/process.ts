import { ConfigurationJSON } from 'src/types/config'
import { useHydraStore } from './store'
import loadScript from '@renderer/utils/loadScript'

export default async function process(_poiesis: string, _config: ConfigurationJSON) {
  const store = useHydraStore.getState()

  const shader = store.shader
  const hydra = store.hydra
  const synth = hydra.synth

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

  // Create function with all Hydra methods in scope
  const evalFunc = new AsyncFunction(...Object.keys(synth), 'synth', 'loadScript', shader)
  evalFunc(...Object.values(synth), synth, loadScript)
  console.log('Shader evaluated successfully')
}
