import QRCodeSVG from 'react-qr-code'
import { useCameraStore } from '../../stores/useCameraStore'

/**
 * Camera streaming controls component
 * Provides UI for starting/stopping the WebSocket server,
 * displaying connection status, and showing QR code for phone connection
 */
export function CameraControls() {
  const { isServerRunning, serverIP, httpPort, clientCount, startServer, stopServer } =
    useCameraStore()

  const connectionURL = `https://${serverIP}:${httpPort}`

  const handleToggleServer = async () => {
    if (isServerRunning) {
      await stopServer()
    } else {
      await startServer()
    }
  }

  return (
    <div className="space-y-4">
      {/* Server Control Button */}
      <button
        onClick={handleToggleServer}
        className={`w-full px-4 py-2 rounded font-medium transition-colors ${
          isServerRunning
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-stone-700 hover:bg-stone-600 text-stone-100'
        }`}
      >
        {isServerRunning ? 'Stop Camera Server' : 'Start Camera Server'}
      </button>

      {/* Server Status */}
      {isServerRunning && (
        <div className="space-y-3 p-4 bg-stone-800 rounded border border-stone-700">
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-stone-100 font-medium">Server Running</span>
          </div>

          {/* Connection Info */}
          <div className="space-y-1">
            <div className="text-xs text-stone-400">Connection URL:</div>
            <div className="text-sm text-stone-100 font-mono bg-stone-900 px-2 py-1 rounded">
              {connectionURL}
            </div>
          </div>

          <div className="text-xs text-stone-400">
            HTTP Port: <span className="text-stone-100">{httpPort}</span>
          </div>

          {/* Client Count */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${clientCount > 0 ? 'bg-blue-500' : 'bg-stone-600'}`}
            />
            <span className="text-xs text-stone-400">
              {clientCount > 0 ? `${clientCount} client(s) connected` : 'No clients connected'}
            </span>
          </div>

          {/* QR Code */}
          <div className="space-y-2 pt-2">
            <div className="text-xs text-stone-400">Scan to connect from phone:</div>
            <div className="bg-white p-3 rounded inline-block">
              <QRCodeSVG value={connectionURL} size={128} />
            </div>
          </div>

          {/* Instructions */}
          <div className="text-xs text-stone-400 pt-2 border-t border-stone-700">
            <p className="mb-1 font-medium text-stone-300">To connect from iPhone:</p>
            <ol className="list-decimal list-inside space-y-1 text-stone-500">
              <li>Ensure phone is on same WiFi network</li>
              <li>Scan QR code or enter URL in Safari</li>
              <li className="text-amber-400">
                Accept certificate warning (tap "Continue" or "Show Details" → "visit this website")
              </li>
              <li>Grant camera permission when prompted</li>
              <li>Click "Start Camera" then "Connect to Server"</li>
            </ol>
            <p className="mt-2 text-xs text-amber-400">
              ⚠️ Certificate warning is normal - using self-signed HTTPS (required for iOS camera
              access)
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
