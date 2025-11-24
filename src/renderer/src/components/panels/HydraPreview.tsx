import Panel from '../common/Panel'

export default function HydraPreview() {
  return (
    <Panel title="Hydra preview" collapsible contentClassName="flex flex-col">
      {/* Top section - expandable */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-stone-100 font-light">Hydra preview</div>
      </div>
    </Panel>
  )
}
