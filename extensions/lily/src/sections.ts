import type { ExtensionContext } from "@ableton-extensions/sdk";
import { BEATS_PER_BAR, barToBeats, snapToBars } from "./util.js";

type Ctx = ExtensionContext<"1.0.0">;

/** Minimum bars between section boundaries — prevents over-segmenting. */
export const MIN_SECTION_BARS = 8;
/** Density change (in # of active tracks) needed to call a boundary. */
export const DENSITY_DELTA = 1;

export interface Section {
  index: number;
  startBar: number;
  endBar: number; // exclusive
  startBeats: number;
  endBeats: number;
  trackCount: number;
  label: string;
}

/**
 * Segment the arrangement into sections by TEXTURE DENSITY (no audio render).
 *
 * We count how many tracks are *active* (have a clip sounding) per bar, then split
 * where that count changes — which distinguishes intro / build / drop / breakdown.
 * Clips merely re-segmenting on the grid don't change the count, so they're ignored.
 * Density rises read as "Build", falls as "Break"; the first section is "Intro".
 * Assumes 4/4 (the SDK doesn't expose an arrangement meter).
 */
export function computeSections(ctx: Ctx): Section[] {
  const clipsPerTrack = ctx.application.song.tracks.map((t) => t.arrangementClips);
  const allClips = clipsPerTrack.flat();
  if (allClips.length === 0) return [];

  const maxEnd = Math.max(...allClips.map((c) => c.endTime));
  const barCount = Math.ceil(maxEnd / BEATS_PER_BAR);

  // active[bar] = number of tracks with a clip overlapping that bar
  const active = new Array<number>(barCount).fill(0);
  for (let bar = 0; bar < barCount; bar++) {
    const bs = barToBeats(bar);
    const be = barToBeats(bar + 1);
    for (const clips of clipsPerTrack) {
      if (clips.some((c) => c.startTime < be && c.endTime > bs)) active[bar]++;
    }
  }

  // Boundary bars where density steps, snapped to the 4-bar grid, kept
  // MIN_SECTION_BARS apart. Bar 0 always opens the first ("Intro") section.
  const boundaries: { bar: number; dir: string }[] = [{ bar: 0, dir: "Intro" }];
  let lastBar = 0;
  for (let bar = 1; bar < barCount; bar++) {
    const delta = active[bar]! - active[bar - 1]!;
    if (Math.abs(delta) < DENSITY_DELTA) continue;
    const snapped = Math.round(snapToBars(barToBeats(bar), 4) / BEATS_PER_BAR);
    if (snapped <= 0 || snapped - lastBar < MIN_SECTION_BARS) continue;
    lastBar = snapped;
    boundaries.push({ bar: snapped, dir: delta > 0 ? "Build" : "Break" });
  }

  return boundaries.map((b, i) => {
    const startBar = b.bar;
    const endBar = i + 1 < boundaries.length ? boundaries[i + 1]!.bar : barCount;
    const trackCount = active[Math.min(startBar, barCount - 1)] ?? 0;
    const label = i === 0 ? `Intro (${trackCount} trk)` : `${b.dir} ${i} (${trackCount} trk)`;
    return {
      index: i,
      startBar,
      endBar,
      startBeats: barToBeats(startBar),
      endBeats: barToBeats(endBar),
      trackCount,
      label,
    };
  });
}
