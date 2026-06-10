import { useEffect } from 'react'
import { editorRegistry } from '../stores/editorRegistry'
import run from '../utils/actions/run'

// MIDI channel 9 (0-indexed), note-on status byte = 0x90 | 9 = 0x99
const NOTE_ON = 0x99

// Natural notes (C D E F G A B repeating) → consonants in alphabetical order
// Accidentals → vowels and punctuation
// C0 = MIDI note 12 (using standard C4 = 60 convention)
const NOTE_MAP: Record<number, string | 'RUN'> = {
  // Natural notes → consonants: B C D F G H J K L M N P Q R S T V W X Y Z
  12: 'b', // C0
  14: 'c', // D0
  16: 'd', // E0
  17: 'f', // F0
  19: 'g', // G0
  21: 'h', // A0
  23: 'j', // B0
  24: 'k', // C1
  26: 'l', // D1
  28: 'm', // E1
  29: 'n', // F1
  31: 'p', // G1
  33: 'q', // A1
  35: 'r', // B1
  36: 's', // C2
  38: 't', // D2
  40: 'v', // E2
  41: 'w', // F2
  43: 'x', // G2
  45: 'y', // A2
  47: 'z', // B2
  48: 'RUN', // C3 → Cmd+Shift+Enter

  // Accidentals → vowels and punctuation
  13: 'a', // C#0
  15: 'e', // D#0
  18: 'i', // F#0
  20: 'o', // G#0
  34: 'u', // A#1
  25: '(', // C#1
  27: ')', // D#1
  30: ' ', // F#1 → space
  32: ',', // G#1
  37: '?', // C#2
  39: '!', // D#2
  46: '.', // A#2
}

export function useMalletKeyboard(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    if (!navigator.requestMIDIAccess) {
      console.warn('[MalletKeyboard] Web MIDI API not available')
      return
    }

    let accessRef: MIDIAccess | null = null

    const handleMessage = (event: MIDIMessageEvent) => {
      if (!event.data) return
      const status = event.data[0]
      const note = event.data[1]
      const velocity = event.data[2]
      if (status !== NOTE_ON || velocity === 0) return

      const action = NOTE_MAP[note]
      if (action === undefined) return

      if (action === 'RUN') {
        run()
        return
      }

      const view = editorRegistry.get()
      if (!view) return

      const { from, to } = view.state.selection.main
      view.dispatch({
        changes: { from, to, insert: action },
        selection: { anchor: from + action.length }
      })
      view.focus()
    }

    const attachToAll = (access: MIDIAccess) => {
      access.inputs.forEach((input) => {
        input.addEventListener('midimessage', handleMessage as EventListener)
      })
    }

    const detachFromAll = (access: MIDIAccess) => {
      access.inputs.forEach((input) => {
        input.removeEventListener('midimessage', handleMessage as EventListener)
      })
    }

    navigator
      .requestMIDIAccess()
      .then((access) => {
        accessRef = access
        attachToAll(access)

        access.onstatechange = () => {
          detachFromAll(access)
          attachToAll(access)
        }
      })
      .catch((err) => {
        console.error('[MalletKeyboard] Failed to access MIDI:', err)
      })

    return () => {
      if (accessRef) {
        detachFromAll(accessRef)
        accessRef.onstatechange = null
      }
    }
  }, [enabled])
}
