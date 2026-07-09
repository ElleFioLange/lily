import { PluginDefinition } from '../utils'
import manifest from './manifest.json'
import { PluginManifest } from 'src/types/plugins'

import init from './init'
import process from './process'
import cleanup from './cleanup'

import Workspace from './ui/Workspace'
import Renderer from './ui/Renderer'
import Monitor from './ui/Monitor'
import Options from './ui/Options'

import { createOperatorStore, OperatorState } from './store'

const OperatorPlugin: PluginDefinition<OperatorState> = {
  manifest: manifest as PluginManifest,
  init,
  process,
  cleanup,
  Workspace,
  Renderer,
  Monitor,
  Options,
  createStore: createOperatorStore
}

export default OperatorPlugin
