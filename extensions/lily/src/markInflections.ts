import type { ExtensionContext } from "@ableton-extensions/sdk";
import { LILY_TAG } from "./util.js";
import { computeSections } from "./sections.js";

type Ctx = ExtensionContext<"1.0.0">;
const log = (...a: unknown[]) => console.log("[lily:mark]", ...a);

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
        // One locator per section boundary (skip the Intro at bar 0).
        const markers = computeSections(ctx).filter((s) => s.startBeats > 0);
        log(`found ${markers.length} inflection point(s)`);

        await update(`Placing ${markers.length} marker(s)…`, 70);
        for (const m of markers) {
          const cp = await ctx.application.song.createCuePoint(m.startBeats);
          cp.name = `${LILY_TAG} ${m.label}`;
        }
        await update("Done", 100);
      })
      .catch((e) => log("failed:", e));
  });

  // Right-clicking any track triggers a whole-arrangement analysis.
  void ctx.ui.registerContextMenuAction("AudioTrack", "Lily: Mark Inflections", "lily.markInflections");
  void ctx.ui.registerContextMenuAction("MidiTrack", "Lily: Mark Inflections", "lily.markInflections");
}
