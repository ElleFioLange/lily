/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-undef */

inlets = 1
outlets = 1

function get_object(id) {
  return new LiveAPI('id ' + id)
}

function get_prop(api, property) {
  const result = api.get(property)
  if (result.length) return result.filter((item) => item !== 'id')
  else return result
}

function construct_getter(api) {
  return function (property) {
    return get_prop(api, property)
  }
}

function serialize_mixer_device(id) {
  const mixer_device = get_object(id)
  post(mixer_device.info)
}

function serialize_clip(id) {
  const clip = get_object(id)
  const get = construct_getter(clip)
  const clip_data = {
    id,
    color: get('color'),
    color_index: get('color_index'),
    end_marker: get('end_marker'),
    end_time: get('end_time'),
    has_envelopes: get('has_envelopes'),
    has_groove: get('has_groove'),
    is_arrangement_clip: get('is_arrangement_clip'),
    is_audio_clip: get('is_audio_clip'),
    is_midi_clip: get('is_midi_clip'),
    is_overdubbing: get('is_overdubbing'),
    is_playing: get('is_playing'),
    is_recording: get('is_recording'),
    is_triggered: get('is_triggered'),
    launch_mode: get('launch_mode'),
    launch_quantization: get('launch_quantization'),
    legato: get('legato'),
    length: get('length'),
    loop_end: get('loop_end'),
    loop_start: get('loop_start'),
    looping: get('looping'),
    muted: get('muted'),
    name: get('name'),
    playing_position: get('playing_position'),
    position: get('position'),
    signature_denominator: get('signature_denominator'),
    signature_numerator: get('signature_numerator'),
    start_marker: get('start_marker'),
    start_time: get('start_time'),
    velocity_amount: get('velocity_amount'),
    will_record_on_start: get('will_record_on_start')
  }
  return clip_data
}

function serialize_clip_slot(id) {
  const clip_slot = get_object(id)
  const get = construct_getter(clip_slot)
  const clip_id = get('clip')[0]
  const clip_data = { ...serialize_clip(clip_id), parent: id }
  const clip_slot_data = {
    id,
    clip_data,
    color: get('color'),
    color_index: get('color_index'),
    controls_other_clips: get('controls_other_clips'),
    has_clip: get('has_clip'),
    has_stop_button: get('has_stop_button'),
    is_group_slot: get('is_group_slot'),
    is_playing: get('is_playing'),
    is_recording: get('is_recording'),
    is_triggered: get('is_triggered'),
    playing_status: get('playing_status'),
    will_record_on_start: get('will_record_on_start')
  }
  return clip_slot_data
}

function serialize_track(id) {
  const track = get_object(id)
  post(track.info)
  const get = construct_getter(track)
  const clip_slot_ids = get('clip_slots')
  const clip_slots_data = clip_slot_ids.map((clip_slot_id) => ({
    ...serialize_clip_slot(clip_slot_id),
    parent: id
  }))
  const mixer_device_id = get('mixer_device')
  serialize_mixer_device(mixer_device_id)
  const device_ids = get('devices')
  const track_data = {
    id,
    clip_slots_data,
    arm: get('arm'),
    available_input_routing_channels: get('available_input_routing_channels'),
    available_input_routing_types: get('available_input_routing_types'),
    available_output_routing_channels: get('available_output_routing_channels'),
    available_output_routing_types: get('available_output_routing_types'),
    back_to_arranger: get('back_to_arranger'),
    can_be_armed: get('can_be_armed'),
    can_be_frozen: get('can_be_frozen'),
    can_show_chains: get('can_show_chains'),
    color: get('color'),
    color_index: get('color_index'),
    fired_slot_index: get('fired_slot_index'),
    has_audio_input: get('has_audio_input'),
    has_audio_output: get('has_audio_output'),
    has_midi_input: get('has_midi_input'),
    has_midi_output: get('has_midi_output'),
    implicit_arm: get('implicit_arm'),
    input_meter_level: get('input_meter_level'),
    input_routing_channel: get('input_routing_channel'),
    input_routing_type: get('input_routing_type'),
    is_foldable: get('is_foldable'),
    is_frozen: get('is_frozen'),
    is_grouped: get('is_grouped'),
    is_part_of_selection: get('is_part_of_selection'),
    is_showing_chains: get('is_showing_chains'),
    is_visible: get('is_visible'),
    mute: get('mute'),
    muted_via_solo: get('muted_via_solo'),
    name: get('name'),
    output_meter_left: get('output_meter_left'),
    output_meter_level: get('output_meter_level'),
    output_meter_right: get('output_meter_right'),
    output_routing_channel: get('output_routing_channel'),
    output_routing_type: get('output_routing_type'),
    performance_impact: get('performance_impact'),
    playing_slot_index: get('playing_slot_index'),
    solo: get('solo')
  }
  outlet_dictionary(0, track_data)
}

// Main Serialization Function
function serialize_song() {
  const song = new LiveAPI('live_set')
  const track_ids = get_prop(song, 'tracks')
  const master = new LiveAPI('live_set master_track')
  const master_id = master.id
  const return_track_ids = get_prop(song, 'return_tracks')
  const scene_ids = get_prop(song, 'scenes')
  const cue_point_ids = get_prop(song, 'cue_points')
  serialize_track(track_ids[0])
}

function bang() {
  post('\n=======================\n')
  serialize_song()
  // post("asdferwer")
}
