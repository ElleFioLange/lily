/**
 * Camera WebSocket streaming type definitions
 */

export interface CameraServerStatus {
  isRunning: boolean
  port: number
  ip: string
  clientCount: number
}

export interface StartServerResult {
  success: boolean
  ip: string
  port: number
  error?: string
}

export interface StopServerResult {
  success: boolean
}

export interface CameraFrame {
  timestamp: number
  data: ArrayBuffer
  size: number
}

export interface CameraSettings {
  port: number
  quality: number // 0-1
  frameRate: number // FPS
  resolution: string // e.g., "640x480"
}
