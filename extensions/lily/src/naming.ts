/**
 * Placeholder evocative clip naming — a prototype to get a feel for the grid.
 *
 * Scheme: the NOUN is stable per track (track identity, so a column reads
 * consistently), the ADJECTIVE comes from the section's energy tier (so the same
 * track reads "Hushed Cinder" in the intro and "Blazing Cinder" at the drop).
 *
 * LATER: swap these pools for Poiesis keywords — replace ADJECTIVES/NOUNS (or the
 * whole `poeticName` body) with a lookup into the poem/keyword source, keyed the
 * same way (energy tier + track + section).
 */
const ADJECTIVES = {
  low: ["hushed", "dim", "veiled", "distant", "faint", "slumbering"],
  mid: ["amber", "drifting", "glowing", "woven", "tidal", "restless"],
  high: ["blazing", "surging", "fractured", "towering", "roaring", "cresting"],
};

const NOUNS = [
  "ember", "spire", "tide", "glass", "ash", "willow", "cobalt", "quartz", "fern",
  "halo", "onyx", "reed", "moth", "slate", "vellum", "cinder", "prism", "hollow",
];

const cap = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1);

/** @param energy01 - section density in [0,1]; @param trackIndex/sectionIndex - seeds. */
export function poeticName(energy01: number, trackIndex: number, sectionIndex: number): string {
  const tier = energy01 < 0.34 ? ADJECTIVES.low : energy01 < 0.67 ? ADJECTIVES.mid : ADJECTIVES.high;
  const adj = tier[sectionIndex % tier.length]!;
  const noun = NOUNS[trackIndex % NOUNS.length]!;
  return `${cap(adj)} ${cap(noun)}`;
}
