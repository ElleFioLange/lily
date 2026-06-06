import type { Clip, ExtensionContext, Track } from "@ableton-extensions/sdk";
import { LILY_TAG } from "./util.js";
import { computeSections, type Section } from "./sections.js";
import { recreateInSlot } from "./placeClip.js";

type Ctx = ExtensionContext<"1.0.0">;
type Song = Ctx["application"]["song"];
const log = (...a: unknown[]) => console.log("[lily:reconstruct]", ...a);

/** The clip on this track with the most overlap into the section, or null. */
function representativeClip(track: Track<"1.0.0">, sec: Section): Clip<"1.0.0"> | null {
  let best: Clip<"1.0.0"> | null = null;
  let bestOverlap = 0;
  for (const c of track.arrangementClips) {
    const overlap = Math.min(c.endTime, sec.endBeats) - Math.max(c.startTime, sec.startBeats);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = c;
    }
  }
  return best;
}

/** Delete scenes from a previous reconstruction (tagged), so re-running is idempotent. */
async function clearLilyScenes(song: Song): Promise<void> {
  const tagged = song.scenes.filter((s) => s.name.startsWith(LILY_TAG));
  // Delete back-to-front so earlier scene handles stay valid.
  for (const scene of tagged.reverse()) await song.deleteScene(scene);
  if (tagged.length) log(`cleared ${tagged.length} previous section scene(s)`);
}

async function run(ctx: Ctx, update: (t: string, p?: number) => Promise<void>): Promise<void> {
  const song = ctx.application.song;

  await update("Analyzing sections…", 10);
  const sections = computeSections(ctx);
  if (sections.length === 0) {
    log("no arrangement clips found");
    return;
  }

  await update("Clearing previous reconstruction…", 18);
  await clearLilyScenes(song);

  // One fresh scene per section, appended at the end (all slots empty by construction).
  const base = song.scenes.length;
  await update(`Creating ${sections.length} section scene(s)…`, 25);
  for (let i = 0; i < sections.length; i++) await song.createScene(song.scenes.length);

  const tracks = song.tracks;
  let placed = 0;
  let failed = 0;
  for (let s = 0; s < sections.length; s++) {
    const sec = sections[s]!;
    const sceneIdx = base + s;

    const scene = song.scenes[sceneIdx];
    if (scene) scene.name = `${LILY_TAG} ${sec.label}`;

    for (const track of tracks) {
      const rep = representativeClip(track, sec);
      if (!rep) continue;
      const slot = track.clipSlots[sceneIdx];
      if (!slot) continue;
      try {
        await recreateInSlot(slot, rep, track.name);
        placed++;
      } catch (e) {
        failed++;
        log(`skip ${track.name} @ ${sec.label}: ${String(e)}`);
      }
    }
    await update(`Section ${s + 1}/${sections.length}: ${sec.label}`, 25 + Math.round((s / sections.length) * 70));
  }

  log(`done — ${sections.length} section scene(s), placed ${placed}, failed ${failed}, from scene ${base + 1}`);
}

export function registerReconstructToSession(ctx: Ctx): void {
  ctx.commands.registerCommand("lily.reconstructToSession", () => {
    // .catch is essential: an unhandled rejection here crashes the Extension Host.
    ctx.ui
      .withinProgressDialog("Lily — Reconstruct to Session", { progress: 0 }, async (update) => {
        await run(ctx, update);
        await update("Done", 100);
      })
      .catch((e) => log("failed:", e));
  });

  void ctx.ui.registerContextMenuAction("AudioTrack", "Lily: Reconstruct to Session", "lily.reconstructToSession");
  void ctx.ui.registerContextMenuAction("MidiTrack", "Lily: Reconstruct to Session", "lily.reconstructToSession");
}
