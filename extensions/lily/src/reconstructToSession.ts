import type { ClipSlot, ExtensionContext, NoteDescription, Track } from "@ableton-extensions/sdk";
import { Clip, MidiClip } from "@ableton-extensions/sdk";
import { LILY_TAG, densityColor } from "./util.js";
import { computeSections, type Section } from "./sections.js";
import { recreateInSlot } from "./placeClip.js";
import { poeticName } from "./naming.js";

type Ctx = ExtensionContext<"1.0.0">;
type Song = Ctx["application"]["song"];
const log = (...a: unknown[]) => console.log("[lily:reconstruct]", ...a);

/** Clips on this track overlapping the section, in time order. */
function clipsInSection(track: Track<"1.0.0">, sec: Section): Clip<"1.0.0">[] {
  return track.arrangementClips
    .filter((c) => c.startTime < sec.endBeats && c.endTime > sec.startBeats)
    .sort((a, b) => a.startTime - b.startTime);
}

/** The clip with the most overlap into the section (audio fallback). */
function maxOverlapClip(clips: Clip<"1.0.0">[], sec: Section): Clip<"1.0.0"> {
  let best = clips[0]!;
  let bestOverlap = -Infinity;
  for (const c of clips) {
    const overlap = Math.min(c.endTime, sec.endBeats) - Math.max(c.startTime, sec.startBeats);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = c;
    }
  }
  return best;
}

/**
 * Consolidate several MIDI clips into one section-length clip: union their notes,
 * shifted from clip-local time to section-local time. Keeps the fill *and* the loop
 * (assumes note times are relative to clip start — true for unwarped/startMarker-0).
 */
async function placeMergedMidi(
  slot: ClipSlot<"1.0.0">,
  clips: MidiClip<"1.0.0">[],
  sec: Section,
  name: string,
  color: number,
): Promise<void> {
  const length = sec.endBeats - sec.startBeats;
  const notes: NoteDescription[] = [];
  for (const c of clips) {
    const offset = c.startTime - sec.startBeats;
    for (const n of c.notes) {
      const startTime = n.startTime + offset;
      if (startTime >= 0 && startTime < length) notes.push({ ...n, startTime });
    }
  }
  const clip = await slot.createMidiClip(length);
  clip.notes = notes;
  clip.name = name;
  clip.color = color;
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
  // Color clips by section energy (blue=sparse → red=full), so the grid shows the arc.
  const maxTrackCount = Math.max(...sections.map((s) => s.trackCount));

  let placed = 0;
  let failed = 0;
  for (let s = 0; s < sections.length; s++) {
    const sec = sections[s]!;
    const sceneIdx = base + s;
    const color = densityColor(sec.trackCount, maxTrackCount);
    const energy01 = maxTrackCount > 0 ? sec.trackCount / maxTrackCount : 0;

    const scene = song.scenes[sceneIdx];
    if (scene) scene.name = `${LILY_TAG} ${sec.label}`;

    for (let ti = 0; ti < tracks.length; ti++) {
      const track = tracks[ti]!;
      const overlapping = clipsInSection(track, sec);
      if (overlapping.length === 0) continue;
      const slot = track.clipSlots[sceneIdx];
      if (!slot) continue;
      const name = poeticName(energy01, ti, sec.index);
      try {
        if (overlapping.length === 1) {
          await recreateInSlot(slot, overlapping[0]!, name, color);
        } else if (overlapping.every((c) => c instanceof MidiClip)) {
          // Multiple MIDI clips (e.g. loop + fill) → merge into one section clip.
          await placeMergedMidi(slot, overlapping as MidiClip<"1.0.0">[], sec, name, color);
        } else {
          // Audio/mixed: can't merge files without a render-bounce — use the dominant clip.
          await recreateInSlot(slot, maxOverlapClip(overlapping, sec), name, color);
        }
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

  void ctx.ui.registerContextMenuAction("AudioTrack", "Reconstruct to Session", "lily.reconstructToSession");
  void ctx.ui.registerContextMenuAction("MidiTrack", "Reconstruct to Session", "lily.reconstructToSession");
}
