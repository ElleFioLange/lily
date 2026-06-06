/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-undef */

// https://docs.cycling74.com/apiref/lom/

inlets = 1
outlets = 1

function get_object(id) {
  return new LiveAPI('id ' + id)
}

function get_prop(api, property) {
  const result = api.get(property)
  if (result.length) return result.filter((item) => item && item !== 'id')
  else return result
}

function construct_get(api) {
  return function (property) {
    return get_prop(api, property)
  }
}

function serialize_device_parameter(id) {
  const param = get_object(id)
  const get = construct_get(param)
  return {
    id,
    name: get('name'),
    value: get('value'),
    display_value: get('display_value'),
    min: get('min'),
    max: get('max'),
    is_enabled: get('is_enabled'),
    is_quantized: get('is_quantized')
  }
}

function serialize_device(id) {
  const device = get_object(id)
  const get = construct_get(device)
  const param_ids = get('parameters')
  const parameters = param_ids.map((param_id) => ({
    ...serialize_device_parameter(param_id),
    parent: id
  }))
  return {
    id,
    name: get('name'),
    class_display_name: get('class_display_name'),
    is_active: get('is_active'),
    parameters
  }
}

function serialize_clip(id) {
  const clip = get_object(id)
  const get = construct_get(clip)
  return {
    id,
    name: get('name'),
    color: get('color'),
    is_playing: get('is_playing'),
    is_recording: get('is_recording'),
    is_triggered: get('is_triggered'),
    length: get('length'),
    looping: get('looping'),
    muted: get('muted')
  }
}

function serialize_clip_slot(id) {
  const clip_slot = get_object(id)
  const get = construct_get(clip_slot)
  const clip_id = get('clip')[0]
  const clip_data = clip_id ? { ...serialize_clip(clip_id), parent: id } : null
  return {
    id,
    has_clip: get('has_clip'),
    clip_data,
    is_playing: get('is_playing'),
    is_recording: get('is_recording'),
    is_triggered: get('is_triggered')
  }
}

function serialize_track(id) {
  const track = get_object(id)
  const get = construct_get(track)
  const device_ids = get('devices')
  const device_data = device_ids.map((device_id) => ({
    ...serialize_device(device_id),
    parent: id
  }))
  const clip_slot_ids = get('clip_slots')
  const clip_slots_data = clip_slot_ids.length
    ? clip_slot_ids.map((clip_slot_id) => ({
        ...serialize_clip_slot(clip_slot_id),
        parent: id
      }))
    : undefined
  return {
    id,
    name: get('name'),
    color: get('color'),
    mute: get('mute'),
    solo: get('solo'),
    arm: get('arm'),
    is_foldable: get('is_foldable'),
    is_grouped: get('is_grouped'),
    is_visible: get('is_visible'),
    clip_slots_data,
    device_data
  }
}

function break_into_packets(long_string) {
  const PACKET_SIZE = 3000
  const packets = []
  const total_packets = Math.ceil(long_string.length / PACKET_SIZE)
  for (let i = 0; i < total_packets; i++) {
    const start = i * PACKET_SIZE
    const end = Math.min(start + PACKET_SIZE, long_string.length)
    packets.push(`${i + 1}/${total_packets} ${long_string.slice(start, end)}`.trim())
  }
  return packets
}

function bang() {
  const song = new LiveAPI('live_set')
  const get = construct_get(song)

  const track_data_arr = get('tracks').map((id) => ({ ...serialize_track(id), parent: song.id }))
  const return_track_data_arr = get('return_tracks').map((id) => ({
    ...serialize_track(id),
    parent: song.id
  }))

  const data = JSON.stringify({ id: song.id, track_data_arr, return_track_data_arr })
  break_into_packets(data).forEach((packet) => outlet(0, packet))
}
