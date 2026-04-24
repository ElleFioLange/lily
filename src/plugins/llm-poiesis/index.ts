import { PluginDefinition, PluginManifest } from 'src/types/plugins'

import manifest from './manifest.json'

import init from './init'
import process from './process'

import Workspace from './ui/Workspace'
import Monitor from './ui/Monitor'
import Options from './ui/Options'
import Renderer from './ui/Renderer'

import { createLLMPoiesisStore, LLMPoiesisState } from './store'
import cleanup from './cleanup'

const LLMPoiesisPlugin: PluginDefinition<LLMPoiesisState> = {
  manifest: manifest as PluginManifest,

  init,
  process,
  cleanup,

  Workspace,
  Monitor,
  Options,
  Renderer,

  createStore: createLLMPoiesisStore
}

export default LLMPoiesisPlugin
