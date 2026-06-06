import { PluginDefinition, PluginManifest } from '../utils'

import manifest from './manifest.json'

import init from './init'
import process from './process'
import cleanup from './cleanup'

import Workspace from './ui/Workspace'
import Monitor from './ui/Monitor'
import Options from './ui/Options'

import { createAbletonStore, AbletonState } from './store'

const AbletonPlugin: PluginDefinition<AbletonState> = {
  manifest: manifest as PluginManifest,

  init,
  process,
  cleanup,

  Workspace,
  Monitor,
  Options,

  createStore: createAbletonStore
}

export default AbletonPlugin
