import { PluginDefinition, PluginManifest } from '../helpers'

import manifest from './manifest.json'

import init from './init'
import process from './process'
import cleanup from './cleanup'

import Workspace from './ui/Workspace'
import Monitor from './ui/Monitor'
import Settings from './ui/Settings'
import Renderer from './ui/Renderer'

import { createHydraStore, HydraState } from './store'

const HydraPlugin: PluginDefinition<HydraState> = {
  manifest: manifest as PluginManifest,

  init,
  process,
  cleanup,

  Workspace,
  Monitor,
  Settings,
  Renderer,

  createStore: createHydraStore
}

export default HydraPlugin
