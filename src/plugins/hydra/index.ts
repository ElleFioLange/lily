import { ConfigurationJSON } from '../../types/config'
import Main from './ui/Main '
import Monitor from './ui/Monitor'
import Settings from './ui/Settings'

export { Main, Monitor, Settings }

export async function init() {
  console.log('initialize the hydra instance and store')
}

export async function process(poiesis: string, config: ConfigurationJSON) {
  console.log('process the poiesis and config and send control signals')
}
