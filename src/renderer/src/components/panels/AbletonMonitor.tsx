import Panel from '../common/Panel'

export default function AbletonMonitor() {
  const handleInitRequest = async () => {
    await window.api.osc.requestInit()
  }

  return (
    <Panel title="Ableton monitor" contentClassName="flex flex-col items-center justify-center p-4">
      <button
        onClick={handleInitRequest}
        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded transition-colors"
      >
        Request Init from Max Device
      </button>
      {/* Future: Display Ableton Live state and metrics */}
    </Panel>
  )
}
