/**
 * Project snapshot — serialize the whole Live Set into a plain tree where every
 * node carries its canonical Max/LOM path.
 *
 * The Extensions SDK hands you objects (`song.tracks`, `track.devices`,
 * `device.parameters`, `track.clipSlots`) but NOT each object's LiveAPI path.
 * That path is positional, so we reconstruct it from the array index as we walk
 * — "looking back" for the index at each level:
 *
 *   live_set tracks 0 clip_slots 2 clip
 *   live_set tracks 0 devices 1 parameters 3
 *   live_set return_tracks 0 mixer_device sends 1
 *   live_set master_track mixer_device volume
 *
 * These are exactly the paths `lily-controller.amxd` resolves via `new LiveAPI(path)`
 * and that `src/plugins/ableton/process.ts` emits over OSC. So this snapshot is
 * the read path: it tells Lily what exists and the path to address each thing.
 *
 * SDK name → LOM path-component differences handled here:
 *   returnTracks → return_tracks   mainTrack → master_track
 *   mixer        → mixer_device    clipSlots → clip_slots
 *
 * Device-parameter *values* are async (`getValue()`); they're intentionally left
 * out of this structural snapshot and read on demand for the focused selection.
 */
import {
  AudioClip,
  Clip,
  Device,
  DeviceParameter,
  MidiClip,
  Song,
  Track,
  TrackMixer
} from "@ableton-extensions/sdk";

type V = "1.0.0";

export type TrackKind = "track" | "return" | "master";
export type ClipKind = "midi" | "audio" | "clip";

export interface ParamNode {
  name: string;
  maxPath: string;
  min: number;
  max: number;
  isQuantized: boolean;
  defaultValue: number;
}

export interface DeviceNode {
  name: string;
  maxPath: string;
  parameters: ParamNode[];
}

export interface ClipNode {
  name: string;
  maxPath: string;
  kind: ClipKind;
  color: number;
  looping: boolean;
  muted: boolean;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface ClipSlotNode {
  maxPath: string;
  hasClip: boolean;
  clip: ClipNode | null;
}

export interface MixerNode {
  maxPath: string;
  volume: ParamNode;
  panning: ParamNode;
  sends: ParamNode[];
}

export interface TrackNode {
  name: string;
  maxPath: string;
  kind: TrackKind;
  mute: boolean;
  solo: boolean;
  arm: boolean;
  devices: DeviceNode[];
  mixer: MixerNode;
  /** Session slots — only regular tracks have them (returns/master are empty). */
  clipSlots: ClipSlotNode[];
}

export interface SceneNode {
  name: string;
  maxPath: string;
  tempo: number;
  signatureNumerator: number;
  signatureDenominator: number;
}

export interface CuePointNode {
  name: string;
  maxPath: string;
  time: number;
}

export interface ProjectSnapshot {
  maxPath: "live_set";
  tempo: number;
  tracks: TrackNode[];
  returnTracks: TrackNode[];
  masterTrack: TrackNode;
  scenes: SceneNode[];
  cuePoints: CuePointNode[];
}

function serializeParam(p: DeviceParameter<V>, maxPath: string): ParamNode {
  return {
    name: p.name,
    maxPath,
    min: p.min,
    max: p.max,
    isQuantized: p.isQuantized,
    defaultValue: p.defaultValue
  };
}

function serializeDevice(d: Device<V>, maxPath: string): DeviceNode {
  return {
    name: d.name,
    maxPath,
    parameters: d.parameters.map((p, i) => serializeParam(p, `${maxPath} parameters ${i}`))
  };
}

function clipKindOf(c: Clip<V>): ClipKind {
  if (c instanceof MidiClip) return "midi";
  if (c instanceof AudioClip) return "audio";
  return "clip";
}

function serializeClip(c: Clip<V>, maxPath: string): ClipNode {
  return {
    name: c.name,
    maxPath,
    kind: clipKindOf(c),
    color: c.color,
    looping: c.looping,
    muted: c.muted,
    startTime: c.startTime,
    endTime: c.endTime,
    duration: c.duration
  };
}

function serializeMixer(m: TrackMixer<V>, trackPath: string): MixerNode {
  const maxPath = `${trackPath} mixer_device`;
  return {
    maxPath,
    volume: serializeParam(m.volume, `${maxPath} volume`),
    panning: serializeParam(m.panning, `${maxPath} panning`),
    sends: m.sends.map((s, i) => serializeParam(s, `${maxPath} sends ${i}`))
  };
}

function serializeTrack(t: Track<V>, maxPath: string, kind: TrackKind): TrackNode {
  // Only regular tracks have session clip slots; addressing
  // `master_track clip_slots N` / `return_tracks N clip_slots N` is invalid.
  const clipSlots: ClipSlotNode[] =
    kind === "track"
      ? t.clipSlots.map((slot, i) => {
          const slotPath = `${maxPath} clip_slots ${i}`;
          const clip = slot.clip;
          return {
            maxPath: slotPath,
            hasClip: clip !== null,
            clip: clip ? serializeClip(clip, `${slotPath} clip`) : null
          };
        })
      : [];

  return {
    name: t.name,
    maxPath,
    kind,
    mute: t.mute,
    solo: t.solo,
    arm: t.arm,
    devices: t.devices.map((d, i) => serializeDevice(d, `${maxPath} devices ${i}`)),
    mixer: serializeMixer(t.mixer, maxPath),
    clipSlots
  };
}

/** Walk the whole Live Set into a path-annotated tree. */
export function serializeSong(song: Song<V>): ProjectSnapshot {
  return {
    maxPath: "live_set",
    tempo: song.tempo,
    tracks: song.tracks.map((t, i) => serializeTrack(t, `live_set tracks ${i}`, "track")),
    returnTracks: song.returnTracks.map((t, i) =>
      serializeTrack(t, `live_set return_tracks ${i}`, "return")
    ),
    masterTrack: serializeTrack(song.mainTrack, "live_set master_track", "master"),
    scenes: song.scenes.map((s, i) => ({
      name: s.name,
      maxPath: `live_set scenes ${i}`,
      tempo: s.tempo,
      signatureNumerator: s.signatureNumerator,
      signatureDenominator: s.signatureDenominator
    })),
    cuePoints: song.cuePoints.map((c, i) => ({
      name: c.name,
      maxPath: `live_set cue_points ${i}`,
      time: c.time
    }))
  };
}
