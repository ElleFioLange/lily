import { Plugin } from '../helpers'

import manifest from './manifest.json'

import init from './init'
import process from './process'

import Workspace from './ui/Workspace'
import Monitor from './ui/Monitor'
import Settings from './ui/Settings'
import Renderer from './ui/Renderer'

import { useHydraStore } from './store'

const HydraPlugin: Plugin = {
  manifest: manifest as Plugin['manifest'],

  init,
  process,

  Workspace,
  Monitor,
  Settings,
  Renderer,

  useStore: useHydraStore
}

export default HydraPlugin
