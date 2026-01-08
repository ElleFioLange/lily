import { ConfigurationJSON } from '../../types/config'
import Main from './ui/main'
import Monitor from './ui/monitor'
import Settings from './ui/settings'

export { Main, Monitor, Settings }

export async function init() {
  console.log('initialize the hydra instance and store')
}

export async function process(poiesis: string, config: ConfigurationJSON) {
  console.log('process the poiesis and config and send control signals')
}
