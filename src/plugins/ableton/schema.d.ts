declare interface AbletonSchema {
  name: string
  present: string | number | boolean
  absent: string | number | boolean
}

declare interface LiveDeviceParameter {
  id: number
  name: string
  original_name: string
  value: number
  min: number
  max: number
  display_value: string
  is_quantized: boolean
  is_enabled: boolean
  automation_state: string
  default_value: number | null
  parent: number
}

declare interface LiveDevice {
  id: number
  name: string
  class_display_name: string
  class_name: string
  is_active: boolean
  type: string
  device_type: string
  can_have_chains: boolean
  can_have_drum_pads: boolean
  parameters: LiveDeviceParameter[]
}

declare interface LiveClip {
  id: number
  name: string
  is_playing: boolean
  is_recording: boolean
  is_triggered: boolean
  length: number
  looping: boolean
  muted: boolean
  color: number
  color_index: number
}

declare interface LiveClipSlot {
  id: number
  has_clip: boolean
  clip_data: LiveClip | null
  is_playing: boolean
  is_recording: boolean
  is_triggered: boolean
  parent: number
}

declare interface LiveTrack {
  id: number
  name: string
  color: number
  color_index: number
  mute?: boolean
  solo?: boolean
  arm?: boolean
  is_foldable: boolean
  is_grouped: boolean
  is_visible: boolean
  clip_slots_data?: LiveClipSlot[]
  device_data: LiveDevice[]
}

declare interface LiveProject {
  id: number
  name: string
  tempo: number
  is_playing: boolean
  track_data_arr: LiveTrack[]
  return_track_data_arr: LiveTrack[]
  master_data: LiveTrack
}
