import { useState } from 'react'
import { useOSCStore } from '../stores/useLiveStore'

/**
 * ConnectionStatus Component
 *
 * This is a legacy component that showed OSC connection status.
 * It has been simplified to just show Max device export functionality.
 *
 * To add OSC connection status back, create custom state in your store:
 * - Track last message timestamp
 * - Track connection status
 * - Display connection indicator
 */
export function ConnectionStatus(): React.JSX.Element {
  const lastMessage = useOSCStore((state) => state.lastMessage)
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
        <span style={{ fontSize: '0.875rem', color: '#888' }}>
          Last OSC: {lastMessage?.address || 'None'}
        </span>
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
