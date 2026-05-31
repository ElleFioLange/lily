import Header from './common/Header'

export default function Monitors() {
  return (
    <div className="flex flex-col h-full">
      <Header title="MONITORS" />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* {HydraPlugin.Monitor && <HydraPlugin.Monitor />} */}
      </div>
    </div>
  )
}
