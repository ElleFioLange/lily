import { AudioClip, Clip, MidiClip } from "@ableton-extensions/sdk";

/** v1 assumes 4/4 — the SDK doesn't expose an arrangement meter. */
export const BEATS_PER_BAR = 4;

/** Prefix on everything Lily writes, so commands can be re-run idempotently. */
export const LILY_TAG = "✦";

export const beatsToBar = (beats: number): number => beats / BEATS_PER_BAR;
export const barToBeats = (bar: number): number => bar * BEATS_PER_BAR;

/** Snap a beat position to the nearest N-bar grid line. */
export const snapToBars = (beats: number, bars: number): number =>
  Math.round(beats / barToBeats(bars)) * barToBeats(bars);

/**
 * Content length of a clip in beats (the trimmed region), with sane fallbacks.
 * Used as the length for a recreated session clip.
 */
export function clipContentLength(clip: Clip<"1.0.0">): number {
  const trimmed = clip.endMarker - clip.startMarker;
  if (trimmed > 0) return trimmed;
  if (clip.duration > 0) return clip.duration;
  return BEATS_PER_BAR;
}

/**
 * A stable content signature for dedup. Two clips with the same key are treated
 * as the same material. MIDI hashes its notes; audio hashes file + trim + warp.
 */
export function clipKey(clip: Clip<"1.0.0">): string {
  if (clip instanceof MidiClip) {
    const notes = clip.notes
      .map((n) => `${n.pitch}@${n.startTime}:${n.duration}:${n.velocity ?? 100}`)
      .sort()
      .join(",");
    return `midi|${clipContentLength(clip).toFixed(4)}|${notes}`;
  }
  if (clip instanceof AudioClip) {
    return [
      "audio",
      clip.filePath,
      clip.startMarker.toFixed(4),
      clip.endMarker.toFixed(4),
      clip.warping ? "w" : "u",
    ].join("|");
  }
  return `other|${clip.name}|${clip.startTime}:${clip.endTime}`;
}
