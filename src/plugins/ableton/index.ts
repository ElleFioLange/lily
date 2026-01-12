import { Plugin } from '../helpers'

import manifest from './manifest.json'

import init from './init'
import process from './process'

import Workspace from './ui/Workspace'
import Monitor from './ui/Monitor'
import Settings from './ui/Settings'

import { useLiveStore } from './store'

const AbletonPlugin: Plugin = {
  manifest: manifest as Plugin['manifest'],

  init,
  process,

  Workspace,
  Monitor,
  Settings,

  useStore: useLiveStore
}

export default AbletonPlugin
