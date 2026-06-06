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

/** HSV (h∈[0,360), s,v∈[0,1]) → packed 0xRRGGBB int for Clip.color. */
export function hsvToRgbInt(h: number, s: number, v: number): number {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const R = Math.round((r + m) * 255);
  const G = Math.round((g + m) * 255);
  const B = Math.round((b + m) * 255);
  return (R << 16) | (G << 8) | B;
}

/** Energy heatmap: 0 tracks → blue, peak → red. (Live snaps to its nearest swatch.) */
export function densityColor(trackCount: number, maxTrackCount: number): number {
  const t = maxTrackCount > 0 ? Math.min(1, trackCount / maxTrackCount) : 0;
  return hsvToRgbInt(240 * (1 - t), 0.65, 0.9); // 240=blue (low) → 0=red (high)
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
