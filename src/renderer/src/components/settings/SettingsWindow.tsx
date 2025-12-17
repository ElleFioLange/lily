import { useEffect, useState } from 'react'
import type { Settings } from '../../../../types/settings'

interface AudioDevice {
  deviceId: string
  label: string
}

export default function SettingsWindow() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [autoDetect, setAutoDetect] = useState(true)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const currentSettings = await window.api.settings.get()
        setSettings(currentSettings)
        setSelectedDeviceId(currentSettings.audio.deviceId)
        setAutoDetect(currentSettings.audio.autoDetect)
      } catch (err) {
        console.error('Failed to load settings:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Enumerate audio devices
  useEffect(() => {
    async function enumerateDevices() {
      try {
        // Request permission first to get device labels
        await navigator.mediaDevices.getUserMedia({ audio: true })

        const devices = await navigator.mediaDevices.enumerateDevices()
        const audioInputs = devices
          .filter((d) => d.kind === 'audioinput')
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `Audio Input ${d.deviceId.slice(0, 8)}`
          }))

        setAudioDevices(audioInputs)

        if (audioInputs.length === 0) {
          setPermissionError('No audio devices found')
        }
      } catch (err) {
        console.error('Failed to enumerate devices:', err)
        setPermissionError('Permission denied or no audio devices available')
      }
    }

    enumerateDevices()
  }, [])

  const handleSave = async () => {
    if (!settings) return

    const newSettings: Settings = {
      audio: {
        deviceId: autoDetect ? null : selectedDeviceId,
        autoDetect
      }
    }

    try {
      await window.api.settings.save(newSettings)
      window.close()
    } catch (err) {
      console.error('Failed to save settings:', err)
      alert('Failed to save settings. Please try again.')
    }
  }

  const handleCancel = () => {
    window.close()
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-stone-950">
        <p className="text-stone-400">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-stone-950 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-100">Settings</h1>
      </div>

      {/* Audio Section */}
      <div className="flex-1">
        <div className="mb-6">
          <h2 className="mb-4 text-lg font-medium text-stone-100">Audio</h2>

          <div className="space-y-4 rounded-lg bg-stone-900 p-4">
            {/* Auto-detect checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="auto-detect"
                checked={autoDetect}
                onChange={(e) => setAutoDetect(e.target.checked)}
                className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-stone-500 focus:ring-2 focus:ring-stone-500 focus:ring-offset-0"
              />
              <label htmlFor="auto-detect" className="ml-2 text-sm text-stone-200">
                Auto-detect BlackHole 16ch device
              </label>
            </div>

            {/* Device selector */}
            <div>
              <label htmlFor="audio-device" className="mb-2 block text-sm text-stone-300">
                Audio Input Device
              </label>

              {permissionError ? (
                <div className="rounded border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-400">
                  {permissionError}
                </div>
              ) : (
                <select
                  id="audio-device"
                  value={selectedDeviceId || ''}
                  onChange={(e) => setSelectedDeviceId(e.target.value || null)}
                  disabled={autoDetect || audioDevices.length === 0}
                  className="w-full rounded border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select audio device...</option>
                  {audioDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              )}

              <p className="mt-2 text-xs text-stone-500">
                This device will be used for audio-reactive text effects in Hydra
              </p>
            </div>

            {/* Info message */}
            {/* {!autoDetect && (
              <div className="rounded border border-stone-700 bg-stone-800 px-3 py-2 text-xs text-stone-400">
                Note: You may need to close and reopen the Hydra popup window for changes to take
                effect
              </div>
            )} */}
          </div>
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex justify-end space-x-3 border-t border-stone-800 pt-4">
        <button
          onClick={handleCancel}
          className="rounded bg-stone-800 px-4 py-2 text-sm text-stone-200 hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-600"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="rounded bg-stone-700 px-4 py-2 text-sm text-stone-100 hover:bg-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-500"
        >
          Save
        </button>
      </div>
    </div>
  )
}
