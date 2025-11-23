/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-undef */

// https://docs.cycling74.com/apiref/lom/

// TODO still need to handle chains

inlets = 1
outlets = 1

function log(msg, t) {
  if (t) post('\n' + msg)
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

function serialize_sample(id) {
  const sample = get_object(id)
  const get = construct_get(sample)
  const sample_data = {
    id,
    beats_granulation_resolution: get('beats_granulation_resolution'),
    beats_transient_envelope: get('beats_transient_envelope'),
    beats_transient_loop_mode: get('beats_transient_loop_mode'),
    complex_pro_envelope: get('complex_pro_envelope'),
    complex_pro_formants: get('complex_pro_formants'),
    end_marker: get('end_marker'),
    file_path: get('file_path'),
    gain: get('gain'),
    length: get('length'),
    sample_rate: get('sample_rate'),
    slices: get('slices'),
    slicing_sensitivity: get('slicing_sensitivity'),
    start_marker: get('start_marker'),
    texture_flux: get('texture_flux'),
    texture_grain_size: get('texture_grain_size'),
    tones_grain_size: get('tones_grain_size'),
    warp_markers: get('warp_markers'),
    warp_mode: get('warp_mode'),
    warping: get('warping'),
    slicing_style: get('slicing_style'),
    slicing_beat_division: get('slicing_beat_division'),
    slicing_region_count: get('slicing_region_count')
  }
  return sample_data
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
  log(device_parameter_data.name)
  return device_parameter_data
}

function serialize_device(id) {
  log('serializing device id: ' + id)
  const device = get_object(id)
  const get = construct_get(device)
  const device_type = device.type
  var device_data = {
    id,
    device_type,
    can_have_chains: get('can_have_chains'),
    can_have_drum_pads: get('can_have_drum_pads'),
    class_display_name: get('class_display_name'),
    class_name: get('class_name'),
    is_active: get('is_active'),
    name: get('name'),
    type: get('type'),
    latency_in_samples: get('latency_in_samples'),
    latency_in_ms: get('latency_in_ms')
  }
  log(device_data.name + ' ' + device_type)
  // rack device get chains, return_chains, drum_pads
  let child_data = get_children(get, ['parameters'], id)
  let extra_data
  switch (device_type) {
    case 'CompressorDevice': {
      extra_data = {
        available_input_routing_channels: get('available_input_routing_channels'),
        available_input_routing_types: get('available_input_routing_types'),
        input_routing_channel: get('input_routing_channel'),
        input_routing_type: get('input_routing_type')
      }
      break
    }
    case 'DriftDevice': {
      extra_data = {
        mod_matrix_filter_source_1_index: get('mod_matrix_filter_source_1_index'),
        mod_matrix_filter_source_1_list: get('mod_matrix_filter_source_1_list'),
        mod_matrix_filter_source_2_index: get('mod_matrix_filter_source_2_index'),
        mod_matrix_filter_source_2_list: get('mod_matrix_filter_source_2_list'),
        mod_matrix_lfo_source_index: get('mod_matrix_lfo_source_index'),
        mod_matrix_lfo_source_list: get('mod_matrix_lfo_source_list'),
        mod_matrix_pitch_source_1_index: get('mod_matrix_pitch_source_1_index'),
        mod_matrix_pitch_source_1_list: get('mod_matrix_pitch_source_1_list'),
        mod_matrix_pitch_source_2_index: get('mod_matrix_pitch_source_2_index'),
        mod_matrix_pitch_source_2_list: get('mod_matrix_pitch_source_2_list'),
        mod_matrix_shape_source_index: get('mod_matrix_shape_source_index'),
        mod_matrix_shape_source_list: get('mod_matrix_shape_source_list'),
        mod_matrix_source_1_index: get('mod_matrix_source_1_index'),
        mod_matrix_source_1_list: get('mod_matrix_source_1_list'),
        mod_matrix_source_2_index: get('mod_matrix_source_2_index'),
        mod_matrix_source_2_list: get('mod_matrix_source_2_list'),
        mod_matrix_source_3_index: get('mod_matrix_source_3_index'),
        mod_matrix_source_3_list: get('mod_matrix_source_3_list'),
        mod_matrix_target_1_index: get('mod_matrix_target_1_index'),
        mod_matrix_target_1_list: get('mod_matrix_target_1_list'),
        mod_matrix_target_2_index: get('mod_matrix_target_2_index'),
        mod_matrix_target_2_list: get('mod_matrix_target_2_list'),
        mod_matrix_target_3_index: get('mod_matrix_target_3_index'),
        mod_matrix_target_3_list: get('mod_matrix_target_3_list'),
        pitch_bend_range: get('pitch_bend_range'),
        voice_count_index: get('voice_count_index'),
        voice_count_list: get('voice_count_list'),
        voice_mode_index: get('voice_mode_index'),
        voice_mode_list: get('voice_mode_list')
      }
      break
    }
    case 'DrumCellDevice': {
      extra_data = {
        gain: get('gain')
      }
      break
    }
    case 'Eq8Device': {
      extra_data = {
        edit_mode: get('edit_mode'),
        global_mode: get('global_mode'),
        oversample: get('oversample')
      }
      break
    }
    case 'HybridReverbDevice': {
      extra_data = {
        ir_attack_time: get('ir_attack_time'),
        ir_category_index: get('ir_category_index'),
        ir_category_list: get('ir_category_list'),
        ir_decay_time: get('ir_decay_time'),
        ir_file_index: get('ir_file_index'),
        ir_file_list: get('ir_file_list'),
        ir_size_factor: get('ir_size_factor'),
        ir_time_shaping_on: get('ir_time_shaping_on')
      }
      break
    }
    case 'LooperDevice': {
      extra_data = {
        loop_length: get('loop_length'),
        overdub_after_record: get('overdub_after_record'),
        record_length_index: get('record_length_index'),
        record_length_list: get('record_length_list'),
        tempo: get('tempo')
      }
      break
    }
    case 'MaxDevice': {
      extra_data = {
        audio_inputs: get('audio_inputs'),
        audio_outputs: get('audio_outputs'),
        midi_inputs: get('midi_inputs'),
        midi_outputs: get('midi_outputs')
      }
      break
    }
    case 'MeldDevice': {
      extra_data = {
        selected_engine: get('selected_engine'),
        unison_voices: get('unison_voices'),
        mono_poly: get('mono_poly'),
        poly_voices: get('poly_voices')
      }
      break
    }
    case 'PluginDevice': {
      extra_data = {
        presets: get('presets'),
        selected_preset_index: get('selected_preset_index')
      }
      break
    }
    case 'RackDevice': {
      extra_data = {
        can_show_chains: get('can_show_chains'),
        has_drum_pads: device_data.can_have_drum_pads ? get('has_drum_pads') : undefined,
        has_macro_mappings: get('has_macro_mappings'),
        is_showing_chains: get('is_showing_chains'),
        variation_count: get('variation_count'),
        selected_variation_index: get('selected_variation_index'),
        visible_macro_count: get('visible_macro_count')
      }
      break
    }
    case 'RoarDevice': {
      extra_data = {
        routing_mode_index: get('routing_mode_index'),
        routing_mode_list: get('routing_mode_list'),
        env_listen: get('env_listen')
      }
      break
    }
    case 'ShifterDevice': {
      extra_data = {
        pitch_bend_range: get('pitch_bend_range'),
        pitch_mode_index: get('pitch_mode_index')
      }
      break
    }
    case 'SimplerDevice': {
      const sample_id = get('sample')
      const sample_data = serialize_sample(sample_id)
      extra_data = {
        sample_data,
        can_warp_as: get('can_warp_as'),
        can_warp_double: get('can_warp_double'),
        can_warp_half: get('can_warp_half'),
        multi_sample_mode: get('multi_sample_mode'),
        pad_slicing: get('pad_slicing'),
        playback_mode: get('playback_mode'),
        playing_position: get('playing_position'),
        playing_position_enabled: get('playing_position_enabled'),
        retrigger: get('retrigger'),
        slicing_playback_mode: get('slicing_playback_mode'),
        voices: get('voices')
      }
      break
    }
    case 'SpectralResonatorDevice': {
      extra_data = {
        frequency_dial_mode: get('frequency_dial_mode'),
        midi_gate: get('midi_gate'),
        mod_mode: get('mod_mode'),
        mono_poly: get('mono_poly'),
        pitch_mode: get('pitch_mode'),
        pitch_bend_range: get('pitch_bend_range'),
        polyphony: get('polyphony')
      }
      break
    }
    case 'WaveTableDevice': {
      extra_data = {
        filter_routing: get('filter_routing'),
        mono_poly: get('mono_poly'),
        oscillator_1_effect_mode: get('oscillator_1_effect_mode'),
        oscillator_2_effect_mode: get('oscillator_2_effect_mode'),
        oscillator_1_wavetable_category: get('oscillator_1_wavetable_category'),
        oscillator_2_wavetable_category: get('oscillator_2_wavetable_category'),
        oscillator_1_wavetable_index: get('oscillator_1_wavetable_index'),
        oscillator_2_wavetable_index: get('oscillator_2_wavetable_index'),
        oscillator_1_wavetables: get('oscillator_1_wavetables'),
        oscillator_2_wavetables: get('oscillator_2_wavetables'),
        oscillator_wavetable_categories: get('oscillator_wavetable_categories'),
        poly_voices: get('poly_voices'),
        unison_mode: get('unison_mode'),
        unison_voice_count: get('unison_voice_count'),
        visible_modulation_target_names: get('visible_modulation_target_names')
      }
      break
    }
  }
  device_data = {
    ...device_data,
    ...child_data,
    ...extra_data
  }
  // outlet_dictionary(0, device_data)
  return device_data
}

function serialize_mixer_device(id, is_master) {
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
    crossfade_assign: is_master ? undefined : get('crossfade_assign'),
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
  log('serializing scene id: ' + id)
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

function serialize_track(id, type) {
  log('serializing ' + type + ' track id: ' + id, true)
  const track = get_object(id)
  const get = construct_get(track)
  log(get('name'), true)
  const mixer_device_id = get('mixer_device')
  const mixer_device_data = serialize_mixer_device(mixer_device_id, type === 'master')
  const device_id_arr = get('devices')
  const device_data = device_id_arr.map((device_id) => ({
    ...serialize_device(device_id),
    parent: id
  }))
  let clip_slots_data = undefined
  if (type === 'audio/midi') {
    const clip_slot_id_arr = get('clip_slots')
    log('test here')
    clip_slots_data = clip_slot_id_arr.map((clip_slot_id) => ({
      ...serialize_clip_slot(clip_slot_id),
      parent: id
    }))
  }
  const track_data = {
    id,
    clip_slots_data,
    mixer_device_data,
    device_data,
    arm: type === 'audio/midi' ? get('arm') : undefined,
    available_input_routing_channels:
      type === 'audio/midi' ? get('available_input_routing_channels') : undefined,
    available_input_routing_types:
      type === 'audio/midi' ? get('available_input_routing_types') : undefined,
    available_output_routing_channels:
      type !== 'master' ? get('available_output_routing_channels') : undefined,
    available_output_routing_types:
      type !== 'master' ? get('available_output_routing_types') : undefined,
    back_to_arranger: get('back_to_arranger'),
    can_be_armed: get('can_be_armed'),
    can_be_frozen: get('can_be_frozen'),
    can_show_chains: get('can_show_chains'),
    color: get('color'),
    color_index: get('color_index'),
    fired_slot_index: type === 'audio/midi' ? get('fired_slot_index') : undefined,
    has_audio_input: get('has_audio_input'),
    has_audio_output: get('has_audio_output'),
    has_midi_input: get('has_midi_input'),
    has_midi_output: get('has_midi_output'),
    implicit_arm: type === 'audio/midi' ? get('implicit_arm') : undefined,
    input_meter_level: get('input_meter_level'),
    input_routing_channel: type === 'audio/midi' ? get('input_routing_channel') : undefined,
    input_routing_type: type === 'audio/midi' ? get('input_routing_type') : undefined,
    is_foldable: get('is_foldable'),
    is_frozen: get('is_frozen'),
    is_grouped: get('is_grouped'),
    is_part_of_selection: get('is_part_of_selection'),
    is_showing_chains: get('is_showing_chains'),
    is_visible: get('is_visible'),
    mute: type !== 'master' ? get('mute') : undefined,
    muted_via_solo: type !== 'master' ? get('muted_via_solo') : undefined,
    name: get('name'),
    output_meter_left: get('output_meter_left'),
    output_meter_level: get('output_meter_level'),
    output_meter_right: get('output_meter_right'),
    output_routing_channel: type !== 'master' ? get('output_routing_channel') : undefined,
    output_routing_type: type !== 'master' ? get('output_routing_type') : undefined,
    performance_impact: get('performance_impact'),
    playing_slot_index: type === 'audio/midi' ? get('playing_slot_index') : undefined,
    solo: type !== 'master' ? get('solo') : undefined
  }
  return track_data
}

// Main Serialization Function
function serialize_song() {
  const song = new LiveAPI('live_set')
  const get = construct_get(song)
  const track_id_arr = get('tracks')
  const track_data_arr = track_id_arr.slice(0, 2).map((track_id) => ({
    ...serialize_track(track_id, 'audio/midi'),
    parent: song.id
  }))
  const return_track_id_arr = get('return_tracks')
  const return_track_data_arr = return_track_id_arr.map((return_track_id) => ({
    ...serialize_track(return_track_id, 'return'),
    parent: song.id
  }))
  const master = new LiveAPI('live_set master_track')
  const master_data = serialize_track(master.id, 'master')
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
    scene_data_arr,
    cue_point_data_arr,
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
  log('\n\n=======================', true)
  const song_data = serialize_song()
  log(JSON.stringify(song_data).length, true)
  outlet_dictionary(0, song_data)
}
