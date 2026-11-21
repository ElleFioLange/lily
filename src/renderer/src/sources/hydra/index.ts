import { SourceDefinition, SourceManifest } from '../types'

import manifest from './manifest.json'

import init from './init'
import process from './process'
import cleanup from './cleanup'

import Workspace from './ui/Workspace'
import Monitor from './ui/Monitor'
import Options from './ui/Options'
import Renderer from './ui/Renderer'

import { createHydraStore, HydraState } from './store'

const HydraSource: SourceDefinition<HydraState> = {
  manifest: manifest as SourceManifest,

  init,
  process,
  cleanup,

  Workspace,
  Monitor,
  Options,
  Renderer,

  createStore: createHydraStore
}

export default HydraSource
