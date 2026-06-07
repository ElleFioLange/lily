import { useState, useMemo, useEffect } from 'react'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin } from '@plugins/utils'
import { PoiesisState } from '@renderer/surfaces/poiesis/store'
import { AbletonState } from '../store'
import { UIProps } from 'src/types/plugins'
import { prependFlags } from '@renderer/utils/configFlags'
import jsyaml from 'js-yaml'

const MODIFIER_MAP = [
  { label: '!keyword()!', trackName: 'Lily - !!' },
  { label: '[keyword()]', trackName: 'Lily - []' },
  { label: '{keyword()}', trackName: 'Lily - {}' }
]

export default function Options({ instanceId }: UIProps) {
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<AbletonState>
  const refresh = instance.useStore((s) => s.refresh)
  const snapshot = instance.useStore((s) => s.snapshot)

  const active = usePluginsStore((s) => s.active)
  const poiesisEntry = useMemo(
    () =>
      Object.values(active).find((p) => p.manifest.id === 'poiesis') as
        | ActivePlugin<PoiesisState>
        | undefined,
    [active]
  )

  const [configFlags, setConfigFlags] = useState(
    () => poiesisEntry?.useStore.getState().configFlags ?? {}
  )
  useEffect(() => {
    if (!poiesisEntry) return
    setConfigFlags(poiesisEntry.useStore.getState().configFlags)
    return poiesisEntry.useStore.subscribe((s) => setConfigFlags(s.configFlags))
  }, [poiesisEntry])

  const [setting, setSetting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const modifierFlag = configFlags['ableton-punctuation-modifiers']
  const returnIndices = modifierFlag ? modifierFlag.split(',').map(Number) : null

  // Check if return tracks still exist in snapshot
  const returnTracksValid = useMemo(() => {
    if (!returnIndices || !snapshot) return false
    const returnTracks = snapshot.returnTracks?.filter((t) => t.name.startsWith('Lily - '))
    return returnTracks && returnTracks.length >= 3
  }, [returnIndices, snapshot])

  async function handleSetup() {
    setSetting(true)
    setError(null)
    try {
      // Send OSC to create return tracks
      window.api.osc.send('/control', ['setup_modifier_returns', '', ''])

      // Wait for tracks to be created, then refresh
      await new Promise((r) => setTimeout(r, 2000))
      await refresh()

      // Find the [Lily] return tracks in the refreshed snapshot
      const state = instance.useStore.getState()
      const snap = state.snapshot
      if (!snap?.returnTracks) throw new Error('No snapshot available after refresh')

      // Return tracks appear in snapshot.returnTracks — their index there is the send index
      const sendIndices: number[] = []

      for (const { trackName } of MODIFIER_MAP) {
        const sendIdx = snap.returnTracks.findIndex((t) => t.name.includes(trackName))
        if (sendIdx === -1) throw new Error(`Could not find return track: ${trackName}`)
        sendIndices.push(sendIdx)
      }

      // Write the flag to the config
      if (!poiesisEntry) throw new Error('No poiesis instance found')
      const poiesisState = poiesisEntry.useStore.getState()
      const newFlags = {
        ...poiesisState.configFlags,
        'ableton-punctuation-modifiers': sendIndices.join(',')
      }
      const yaml = jsyaml.dump(poiesisState.parsedConfig, { indent: 2, lineWidth: -1 })
      poiesisEntry.useStore.getState().setConfig(prependFlags(yaml, newFlags))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSetting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 text-stone-100">
      <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider">
        Punctuation Modifiers
      </h3>

      <div className="flex flex-col gap-2 text-xs">
        {MODIFIER_MAP.map(({ label, trackName }, i) => (
          <div key={label} className="flex items-center gap-3">
            <code className="bg-stone-800 px-2 py-1 rounded font-mono text-stone-300">{label}</code>
            <span className="text-stone-400">{trackName}</span>
            {returnIndices && (
              <span className="text-stone-500 ml-auto">send {returnIndices[i]}</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSetup}
          disabled={setting}
          className="px-3 py-1.5 text-xs bg-stone-700 hover:bg-stone-600 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {setting
            ? 'Setting up...'
            : returnIndices
              ? 'Reconfigure Returns'
              : 'Setup Modifier Returns'}
        </button>

        {returnIndices && (
          <span className={`text-xs ${returnTracksValid ? 'text-green-500' : 'text-yellow-500'}`}>
            {returnTracksValid ? 'Configured' : 'Tracks may have changed'}
          </span>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
