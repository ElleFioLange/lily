import { SourceDefinition, SourceManifest } from '@renderer/sources/types'

import manifest from './manifest.json'

import init from './init'
import process from './process'

import Workspace from './ui/Workspace'
import Monitor from './ui/Monitor'
import Options from './ui/Options'

import { createPoiesisStore, PoiesisState } from './store'
import cleanup from './cleanup'
import MalletKeyboard from './mallet/MalletKeyboard'

const PoiesisSource: SourceDefinition<PoiesisState> = {
  manifest: manifest as SourceManifest,

  init,
  process,
  cleanup,

  Workspace,
  Monitor,
  Options,
  Background: MalletKeyboard,

  createStore: createPoiesisStore
}

export default PoiesisSource
