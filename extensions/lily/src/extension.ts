/**
 * Lily — Ableton Live extension.
 *
 * Two on-command tools (right-click any track):
 *   - Mark Inflections : analyzes the arrangement and drops locators at section
 *                        boundaries + risers/fills (4/4, structural pass).
 *   - Dedupe to Session: collects unique arrangement clips per track and lays
 *                        them into Session view from the first empty scene,
 *                        autonamed. Non-destructive; audio best-effort.
 *
 * See ../../docs/ABLETON_EXTENSION.md for capabilities/limits this is built on.
 */
import { initialize, type ActivationContext } from "@ableton-extensions/sdk";
import * as http from "node:http";
import { registerMarkInflections } from "./markInflections.js";
import { registerDedupeToSession } from "./dedupeToSession.js";

export function activate(activation: ActivationContext) {
  const context = initialize(activation, "1.0.0");

  registerMarkInflections(context);
  registerDedupeToSession(context);

  // --- DEV TEST HARNESS (opt-in) ---------------------------------------------
  // Off by default. Set LILY_DEV_HARNESS=1 to expose an HTTP server that fires
  // the commands from outside Live (curl) and inspects state — handy for testing
  // without right-clicking. In production the commands run from the track context
  // menu and this server isn't started.
  if (process.env.LILY_DEV_HARNESS !== "1") {
    console.log("[lily] activated — Mark Inflections + Dedupe to Session registered");
    return;
  }

  const PORT = 7879;
  const server = http.createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    const url = req.url ?? "/";
    try {
      if (url.startsWith("/mark")) {
        context.commands.executeCommand("lily.markInflections");
        res.end(JSON.stringify({ ok: true, ran: "markInflections" }));
      } else if (url.startsWith("/dedupe")) {
        context.commands.executeCommand("lily.dedupeToSession");
        res.end(JSON.stringify({ ok: true, ran: "dedupeToSession" }));
      } else if (url.startsWith("/state")) {
        const song = context.application.song;
        res.end(
          JSON.stringify(
            {
              tempo: song.tempo,
              sceneCount: song.scenes.length,
              cuePoints: song.cuePoints.map((c) => ({
                name: c.name,
                beat: c.time,
                bar: c.time / 4 + 1,
              })),
              tracks: song.tracks.map((t) => ({
                name: t.name,
                arrangementClips: t.arrangementClips.length,
                session: t.clipSlots.map((s) => s.clip?.name ?? null).filter(Boolean),
              })),
            },
            null,
            2,
          ),
        );
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "try /mark /dedupe /state" }));
      }
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String(e) }));
    }
  });
  server.on("error", (e) => console.log("[lily] harness error", e));
  server.listen(PORT, "127.0.0.1", () => console.log(`[lily] dev harness on http://127.0.0.1:${PORT} (/mark /dedupe /state)`));
  // --- end dev harness -------------------------------------------------------

  console.log("[lily] activated — Mark Inflections + Dedupe to Session registered");
}
