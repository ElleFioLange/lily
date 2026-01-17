import { PluginDefinition, PluginManifest } from 'src/types/plugins'

import manifest from './manifest.json'

import init from './init'
import process from './process'

import Workspace from './ui/Workspace'
import Settings from './ui/Settings'

import cleanup from './cleanup'

const ConfigPlugin: PluginDefinition = {
  manifest: manifest as PluginManifest,

  init,
  process,
  cleanup,

  Workspace,
  Settings
}

export default ConfigPlugin
