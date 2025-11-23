import Panel from '../common/Panel'

export default function HydraPreview() {
  return (
    <Panel title="Hydra preview" collapsible contentClassName="flex flex-col">
      {/* Top section - expandable */}
      <div className="flex-1 flex items-center justify-center bg-gray-2">
        <div className="text-text-1 opacity-50">|||</div>
      </div>

      {/* Video controls section */}
      <div className="bg-gray-3 p-4 flex items-center justify-center">
        <div className="text-text-1 font-light">Video controls</div>
      </div>

      {/* Bottom section - expandable */}
      <div className="flex-1 flex items-center justify-center bg-gray-2">
        <div className="text-text-1 opacity-50">|||</div>
      </div>
    </Panel>
  )
}
