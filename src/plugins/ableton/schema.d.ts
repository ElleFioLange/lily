declare interface AbletonSchema {
  name: string
  present: string | number | boolean
  absent: string | number | boolean
}

declare interface AbletonDeviceParameter {
  id: number
  name: string
  value: number
  min: number
  max: number
  display_value: string
  is_quantized: boolean
  is_enabled: boolean
  parent: number
}

declare interface AbletonDevice {
  id: number
  name: string
  class_display_name: string
  is_active: boolean
  parameters: AbletonDeviceParameter[]
}

declare interface AbletonClip {
  id: number
  name: string
  color: number
  is_playing: boolean
  is_recording: boolean
  is_triggered: boolean
  length: number
  looping: boolean
  muted: boolean
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
  track_data_arr: AbletonTrack[]
  return_track_data_arr: AbletonTrack[]
  master_track: AbletonTrack
}
