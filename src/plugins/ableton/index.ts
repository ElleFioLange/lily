import { PluginDefinition, PluginManifest } from '../helpers'

import manifest from './manifest.json'

import init from './init'
import process from './process'
import cleanup from './cleanup'

import Workspace from './ui/Workspace'
import Monitor from './ui/Monitor'
import Settings from './ui/Settings'

import { createLiveStore, LiveState } from './store'

const AbletonPlugin: PluginDefinition<LiveState> = {
  manifest: manifest as PluginManifest,

  init,
  process,
  cleanup,

  Workspace,
  Monitor,
  Settings,

  createStore: createLiveStore
}

export default AbletonPlugin
