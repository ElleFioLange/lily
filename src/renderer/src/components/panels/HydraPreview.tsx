import Panel from '../common/Panel'

export default function HydraPreview() {
  return (
    <Panel title="Hydra preview" collapsible contentClassName="flex flex-col">
      {/* Top section - expandable */}
      <div className="flex-1 flex items-center justify-center bg-stone-700">
        <div className="text-stone-100 opacity-50">|||</div>
      </div>

      {/* Video controls section */}
      <div className="bg-stone-800 p-4 flex items-center justify-center">
        <div className="text-stone-100 font-light">Video controls</div>
      </div>

      {/* Bottom section - expandable */}
      <div className="flex-1 flex items-center justify-center bg-stone-700">
        <div className="text-stone-100 opacity-50">|||</div>
      </div>
    </Panel>
  )
}
