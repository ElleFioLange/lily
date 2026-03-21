import { PluginDefinition, PluginManifest } from 'src/types/plugins'

import manifest from './manifest.json'

import init from './init'
import process from './process'

import Workspace from './ui/Workspace'
import Monitor from './ui/Monitor'
import Options from './ui/Options'

import { createPoiesisStore, ClaudePoiesisState } from './store'
import cleanup from './cleanup'

const ClaudePoiesisPlugin: PluginDefinition<ClaudePoiesisState> = {
  manifest: manifest as PluginManifest,

  init,
  process,
  cleanup,

  Workspace,
  Monitor,
  Options,

  createStore: createPoiesisStore
}

export default ClaudePoiesisPlugin
