import { useState } from 'react'
import { useLiveStore } from '../stores/useLiveStore'

export function ConnectionStatus(): React.JSX.Element {
  const connection = useLiveStore((state) => state.connection)
  const [exportMessage, setExportMessage] = useState<string | null>(null)

  const handleExport = async (): Promise<void> => {
    const result = await window.api.maxDevice.export()
    if (result.success) {
      setExportMessage(`Device exported to: ${result.filePath}`)
      setTimeout(() => setExportMessage(null), 5000)
    } else {
      setExportMessage(`Export failed: ${result.error}`)
      setTimeout(() => setExportMessage(null), 5000)
    }
  }

  const handleQuickInstall = async (): Promise<void> => {
    const result = await window.api.maxDevice.quickInstall()
    if (result.success) {
      setExportMessage('Device installed to Ableton User Library!')
      setTimeout(() => setExportMessage(null), 5000)
    } else {
      setExportMessage(`Quick install failed: ${result.error}`)
      setTimeout(() => setExportMessage(null), 5000)
    }
  }

  const formatLastSeen = (): string => {
    if (!connection.lastMessageTime) return 'Never'
    const seconds = Math.floor((Date.now() - connection.lastMessageTime) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ago`
  }

  return (
    <div
      style={{
        padding: '1rem',
        borderBottom: '1px solid #333',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: connection.connected ? '#4ade80' : '#ef4444'
            }}
          />
          <span style={{ fontWeight: 500 }}>
            {connection.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {connection.lastMessageTime && (
          <span style={{ fontSize: '0.875rem', color: '#888' }}>
            Last message: {formatLastSeen()}
          </span>
        )}
        {connection.deviceVersion && (
          <span style={{ fontSize: '0.875rem', color: '#888' }}>
            Device v{connection.deviceVersion}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {exportMessage && (
          <span
            style={{
              fontSize: '0.875rem',
              color: exportMessage.includes('failed') ? '#ef4444' : '#4ade80'
            }}
          >
            {exportMessage}
          </span>
        )}
        <button
          onClick={handleQuickInstall}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          Quick Install
        </button>
        <button
          onClick={handleExport}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6366f1',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          Export Max Device
        </button>
      </div>
    </div>
  )
}
