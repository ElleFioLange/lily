import { useEffect, useState } from 'react'
import { useMalletKeyboard } from './useMalletKeyboard'

/**
 * Turns the Mallet MIDI controller into a keyboard for the Poiesis editor when enabled in
 * Settings. Mounted once at app level (see `Background` on SourceDefinition), so it only
 * exists when Poiesis is enabled.
 */
export default function MalletKeyboard(): null {
  const [enabled, setEnabled] = useState(false)

  useMalletKeyboard(enabled)

  // Reload on mount and whenever the main window regains focus (e.g. after closing settings)
  useEffect(() => {
    const load = () =>
      window.api.settings.get().then((s) => setEnabled(s.malletKeyboard?.enabled ?? false))
    load()
    window.addEventListener('focus', load)
    return () => window.removeEventListener('focus', load)
  }, [])

  return null
}
