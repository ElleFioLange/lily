/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-undef */

inlets = 1
outlets = 1

function log(msg, t) {
  if (t) post('\n' + msg + '\n')
}

function get_object(id) {
  return new LiveAPI('id ' + id)
}

function get_prop(api, property) {
  const result = api.get(property)
  if (result.length) return result.filter((item) => item && item !== 'id')
  else return result
}

function get_children(get, child_arr, parent_id) {
  return Object.fromEntries(
    child_arr.map((child) => {
      const child_id_arr = get(child)
      child_data_arr = child_id_arr.map((child_id) => ({
        ...serialize_device_parameter(child_id),
        parent: parent_id
      }))
      return [child, child_data_arr]
    })
  )
}

function construct_get(api) {
  return function (property) {
    return get_prop(api, property)
  }
}

function serialize_cue_point(id) {
  log('serializing cue point id: ' + id)
  const cue_point = get_object(id)
  const get = construct_get(cue_point)
  const cue_point_data = {
    id,
    name: get('name'),
    time: get('time')
  }
  return cue_point_data
}

function serialize_device_parameter(id) {
  log('serializing device parameter id: ' + id)
  const device_parameter = get_object(id)
  const get = construct_get(device_parameter)
  const is_quantized = get('is_quantized')
  const device_parameter_data = {
    id,
    automation_state: get('automation_state'),
    default_value: is_quantized ? null : get('default_value'),
    display_value: get('display_value'),
    is_enabled: get('is_enabled'),
    is_quantized,
    max: get('max'),
    min: get('min'),
    name: get('name'),
    original_name: get('original_name'),
    state: get('state'),
    value: get('value')
  }
  return device_parameter_data
}

function serialize_device(id) {
  log('serializing device id: ' + id)
  const device = get_object(id)
  const get = construct_get(device)
  const child_data = get_children(get, ['parameters'], id)
  const device_data = {
    id,
    ...child_data,
    can_have_chains: get('can_have_chains'),
    can_have_drum_pads: get('can_have_drum_pads'),
    class_display_name: get('class_display_name'),
    class_name: get('class_name'),
    is_active: get('is_active'),
    name: get('name'),
    type: get('type'),
    latency_in_samples: get('latency_in_samples'),
    latency_in_ms: get('latency_in_ms'),
    can_compare_ab: get('can_compare_ab'),
    is_using_compare_preset_b: get('is_using_compare_preset_b')
  }
  return device_data
}

function serialize_mixer_device(id) {
  log('serializing mixer device id: ' + id)
  const mixer_device = get_object(id)
  const get = construct_get(mixer_device)
  const child_data = get_children(
    get,
    ['sends', 'left_split_stereo', 'panning', 'right_split_stereo', 'track_activator', 'volume'],
    id
  )
  const mixer_device_data = {
    id,
    ...child_data,
    crossfade_assign: get('crossfade_assign'),
    panning_mode: get('panning_mode')
  }
  return mixer_device_data
}

function serialize_clip(id) {
  log('serializing clip id: ' + id)
  const clip = get_object(id)
  const get = construct_get(clip)
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
  log('serializing clip slot id: ' + id)
  const clip_slot = get_object(id)
  const get = construct_get(clip_slot)
  const clip_id = get('clip')[0]
  const clip_data = clip_id ? { ...serialize_clip(clip_id), parent: id } : null
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

function serialize_scene(id) {
  const scene = get_object(id)
  const get = construct_get(scene)
  const clip_slot_id_arr = get('clip_slots')
  const clip_slots_data = clip_slot_id_arr.map((clip_slot_id) => ({
    ...serialize_clip_slot(clip_slot_id),
    parent: id
  }))
  const scene_data = {
    id,
    clip_slots_data,
    color: get('color'),
    color_index: get('color_index'),
    is_empty: get('is_empty'),
    is_triggered: get('is_triggered'),
    name: get('name'),
    tempo: get('tempo'),
    tempo_enabled: get('tempo_enabled'),
    time_signature_numerator: get('time_signature_numerator'),
    time_signature_denominator: get('time_signature_denominator'),
    time_signature_enabled: get('time_signature_enabled')
  }
  return scene_data
}

function serialize_track(id) {
  log('serializing track id: ' + id)
  const track = get_object(id)
  const get = construct_get(track)
  const clip_slot_id_arr = get('clip_slots')
  const clip_slots_data = clip_slot_id_arr.map((clip_slot_id) => ({
    ...serialize_clip_slot(clip_slot_id),
    parent: id
  }))
  const mixer_device_id = get('mixer_device')
  const mixer_device_data = serialize_mixer_device(mixer_device_id)
  const device_id_arr = get('devices')
  const device_data = device_id_arr.map((device_id) => ({
    ...serialize_device(device_id),
    parent: id
  }))
  const track_data = {
    id,
    clip_slots_data,
    mixer_device_data,
    device_data,
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
  return track_data
}

// Main Serialization Function
function serialize_song() {
  const song = new LiveAPI('live_set')
  const get = construct_get(song)
  const track_id_arr = get('tracks')
  const track_data_arr = track_id_arr.map((track_id) => ({
    ...serialize_track(track_id),
    parent: song.id
  }))
  const return_track_id_arr = get('return_tracks')
  const return_track_data_arr = return_track_id_arr.map((return_track_id) => ({
    ...serialize_track(return_track_id),
    parent: song.id
  }))
  const master = new LiveAPI('live_set master_track')
  const master_data = serialize_track(master.id)
  const scene_id_arr = get('scenes')
  const scene_data_arr = scene_id_arr.map((scene_id) => ({
    ...serialize_scene(scene_id),
    parent: song.id
  }))
  const cue_point_id_arr = get('cue_points')
  const cue_point_data_arr = cue_point_id_arr.map((cue_point_id) => ({
    ...serialize_cue_point(cue_point_id),
    parent: song.id
  }))
  const song_data = {
    id: song.id,
    track_data_arr,
    return_track_data_arr,
    master_data,
    appointed_device: get('appointed_device'),
    arrangement_overdub: get('arrangement_overdub'),
    back_to_arranger: get('back_to_arranger'),
    can_capture_midi: get('can_capture_midi'),
    can_jump_to_next_cue: get('can_jump_to_next_cue'),
    can_jump_to_prev_cue: get('can_jump_to_prev_cue'),
    can_redo: get('can_redo'),
    can_undo: get('can_undo'),
    clip_trigger_quantization: get('clip_trigger_quantization'),
    count_in_duration: get('count_in_duration'),
    current_song_time: get('current_song_time'),
    exclusive_arm: get('exclusive_arm'),
    exclusive_solo: get('exclusive_solo'),
    file_path: get('file_path'),
    groove_amount: get('groove_amount'),
    is_ableton_link_enabled: get('is_ableton_link_enabled'),
    is_ableton_link_start_stop_sync_enabled: get('is_ableton_link_start_stop_sync_enabled'),
    is_counting_in: get('is_counting_in'),
    is_playing: get('is_playing'),
    last_event_time: get('last_event_time'),
    loop: get('loop'),
    loop_length: get('loop_length'),
    loop_start: get('loop_start'),
    metronome: get('metronome'),
    midi_recording_quantization: get('midi_recording_quantization'),
    name: get('name'),
    nudge_down: get('nudge_down'),
    nudge_up: get('nudge_up'),
    tempo_follower_enabled: get('tempo_follower_enabled'),
    overdub: get('overdub'),
    punch_in: get('punch_in'),
    punch_out: get('punch_out'),
    re_enable_automation_enabled: get('re_enable_automation_enabled'),
    record_mode: get('record_mode'),
    root_note: get('root_note'),
    scale_intervals: get('scale_intervals'),
    scale_mode: get('scale_mode'),
    scale_name: get('scale_name'),
    select_on_launch: get('select_on_launch'),
    session_automation_record: get('session_automation_record'),
    session_record: get('session_record'),
    session_record_status: get('session_record_status'),
    signature_denominator: get('signature_denominator'),
    signature_numerator: get('signature_numerator'),
    song_length: get('song_length'),
    start_time: get('start_time'),
    swing_amount: get('swing_amount'),
    tempo: get('tempo')
  }
  return song_data
}

function bang() {
  log('=======================')
  const song_data = serialize_song()
  outlet_dictionary(0, song_data)
}
