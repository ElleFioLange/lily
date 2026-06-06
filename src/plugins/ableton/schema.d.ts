declare interface AbletonSchema {
  name: string
  present: string | number | boolean
  absent: string | number | boolean
}

declare interface AbletonDeviceParameter {
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

declare interface AbletonDevice {
  id: number
  name: string
  class_display_name: string
  class_name: string
  is_active: boolean
  type: string
  device_type: string
  can_have_chains: boolean
  can_have_drum_pads: boolean
  parameters: AbletonDeviceParameter[]
}

declare interface AbletonClip {
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

declare interface AbletonClipSlot {
  id: number
  has_clip: boolean
  clip_data: AbletonClip | null
  is_playing: boolean
  is_recording: boolean
  is_triggered: boolean
  parent: number
}

declare interface AbletonTrack {
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
  clip_slots_data?: AbletonClipSlot[]
  device_data: AbletonDevice[]
}

declare interface AbletonProject {
  id: number
  name: string
  tempo: number
  is_playing: boolean
  track_data_arr: AbletonTrack[]
  return_track_data_arr: AbletonTrack[]
  master_data: AbletonTrack
}
