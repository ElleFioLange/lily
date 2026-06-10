import type { ClipSlot } from '@ableton-extensions/sdk'
import { AudioClip, Clip, MidiClip } from '@ableton-extensions/sdk'
import { clipContentLength } from './util.js'

/**
 * Recreate a source arrangement clip in a session slot. MIDI is faithful (notes
 * copied); audio is best-effort — trim/warp/loop carry via loopSettings, falling
 * back to the untrimmed file if Live rejects the settings.
 */
export async function recreateInSlot(
  slot: ClipSlot<'1.0.0'>,
  source: Clip<'1.0.0'>,
  name: string,
  /** Override the clip color; defaults to the source clip's color. */
  color?: number
): Promise<void> {
  if (source instanceof MidiClip) {
    const clip = await slot.createMidiClip(clipContentLength(source))
    clip.notes = source.notes
    clip.name = name
    clip.color = color ?? source.color
    return
  }

  if (source instanceof AudioClip) {
    let clip: AudioClip<'1.0.0'>
    try {
      clip = await slot.createAudioClip({
        filePath: source.filePath,
        isWarped: source.warping,
        loopSettings: {
          looping: source.warping ? source.looping : false,
          startMarker: source.startMarker,
          endMarker: source.endMarker,
          loopStart: source.loopStart,
          loopEnd: source.loopEnd
        }
      })
    } catch {
      clip = await slot.createAudioClip({ filePath: source.filePath })
    }
    clip.name = name
    clip.color = color ?? source.color
  }
}
