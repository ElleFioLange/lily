import { PluginDefinition, PluginManifest } from 'src/types/plugins'

import manifest from './manifest.json'

import init from './init'
import process from './process'

import Workspace from './ui/Workspace'
import Monitor from './ui/Monitor'
import Options from './ui/Options'

import { createPoiesisStore, PoiesisState } from './store'
import cleanup from './cleanup'

const PoiesisPlugin: PluginDefinition<PoiesisState> = {
  manifest: manifest as PluginManifest,

  init,
  process,
  cleanup,

  Workspace,
  Monitor,
  Options,

  createStore: createPoiesisStore
}

export default PoiesisPlugin
