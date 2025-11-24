import Panel from '../common/Panel'

export default function AbletonMonitor() {
  const handleInitRequest = async () => {
    // Example: Send a custom init request message
    // Customize this for your application
    await window.api.osc.send('/init/request')
  }

  return (
    <Panel title="Ableton monitor" contentClassName="flex flex-col items-center justify-center p-4">
      <button
        onClick={handleInitRequest}
        className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-stone-100 rounded transition-colors"
      >
        Request Init from Max Device
      </button>
      {/* Future: Display Ableton Live state and metrics */}
    </Panel>
  )
}
