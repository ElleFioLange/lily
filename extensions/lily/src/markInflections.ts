import type { ExtensionContext } from "@ableton-extensions/sdk";
import { BEATS_PER_BAR, LILY_TAG, barToBeats, snapToBars } from "./util.js";

type Ctx = ExtensionContext<"1.0.0">;
const log = (...a: unknown[]) => console.log("[lily:mark]", ...a);

interface Marker {
  beats: number;
  name: string;
}

/** Minimum bars between section markers — prevents over-segmenting. */
const MIN_SECTION_BARS = 8;
/** Density change (in # of active tracks) needed to call a boundary. */
const DENSITY_DELTA = 1;

/**
 * Structural inflection analysis via TEXTURE DENSITY (no audio render, sync reads).
 *
 * Counting clip *onsets* just detects the clip grid (parts chopped into 8-bar
 * clips → a false "section" every 8 bars). Instead we measure how many tracks are
 * *active* (have a clip sounding) in each bar, and mark where that count CHANGES —
 * which is what actually distinguishes intro / build / drop / breakdown. Clips that
 * merely re-segment on the grid don't change the active-track count, so they're
 * ignored. A rise in density reads as a "Build", a fall as a "Break".
 *
 * The audio-render pass (rising RMS/centroid = true risers) is an optional
 * refinement — see `detectRisersFromAudio` below. v1 ships structural-only.
 */
function analyzeStructure(ctx: Ctx): Marker[] {
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

  // Mark bars where density steps up/down, snapped to the 4-bar grid and kept
  // at least MIN_SECTION_BARS apart (first change in a cluster wins).
  const markers: Marker[] = [];
  let lastBar = -MIN_SECTION_BARS;
  let n = 1;
  for (let bar = 1; bar < barCount; bar++) {
    const delta = active[bar] - active[bar - 1];
    if (Math.abs(delta) < DENSITY_DELTA) continue;
    const snapped = Math.round(snapToBars(barToBeats(bar), 4) / BEATS_PER_BAR);
    if (snapped <= 0 || snapped - lastBar < MIN_SECTION_BARS) continue;
    lastBar = snapped;
    const dir = delta > 0 ? "Build" : "Break";
    markers.push({ beats: barToBeats(snapped), name: `${LILY_TAG} ${dir} ${n++} (${active[bar]} trk)` });
  }

  return markers;
}

/**
 * OPTIONAL refinement (not wired in v1): render each audio track over a window
 * with `ctx.resources.renderPreFxAudio(track, startBeat, endBeat)`, decode the
 * WAV, and look for rising RMS + spectral centroid over the last bar before a
 * boundary — that's a true riser. MIDI/instrument tracks don't render, so this
 * complements (does not replace) the structural pass.
 */
// async function detectRisersFromAudio(ctx: Ctx): Promise<Marker[]> { ... }

/** Remove markers Lily previously created, so re-running is idempotent. */
async function clearLilyMarkers(ctx: Ctx): Promise<void> {
  const song = ctx.application.song;
  const mine = song.cuePoints.filter((c) => c.name.startsWith(LILY_TAG));
  for (const cp of mine) await song.deleteCuePoint(cp);
  if (mine.length) log(`cleared ${mine.length} previous marker(s)`);
}

export function registerMarkInflections(ctx: Ctx): void {
  ctx.commands.registerCommand("lily.markInflections", () => {
    // .catch is essential: an unhandled rejection here crashes the Extension Host.
    ctx.ui
      .withinProgressDialog("Lily — Mark Inflections", { progress: 0 }, async (update) => {
        await update("Clearing previous markers…", 10);
        await clearLilyMarkers(ctx);

        await update("Analyzing arrangement…", 40);
        const markers = analyzeStructure(ctx);
        log(`found ${markers.length} inflection point(s)`);

        await update(`Placing ${markers.length} marker(s)…`, 70);
        for (const m of markers) {
          const cp = await ctx.application.song.createCuePoint(m.beats);
          cp.name = m.name;
        }
        await update("Done", 100);
      })
      .catch((e) => log("failed:", e));
  });

  // Right-clicking any track triggers a whole-arrangement analysis.
  void ctx.ui.registerContextMenuAction("AudioTrack", "Lily: Mark Inflections", "lily.markInflections");
  void ctx.ui.registerContextMenuAction("MidiTrack", "Lily: Mark Inflections", "lily.markInflections");
}
