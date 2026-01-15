import Header from './common/Header'

export default function Mixer() {
  return (
    <>
      <Header options={[]} active="test 1" title="MIXER" setActive={() => {}} />

      <div className="max-h-full p-4 pb-0 [&::last-child]:mb-4 overflow-auto no-scrollbar text-xs flex flex-col gap-1 *:align-center font-neon">
        <span className="font-bold my-1 text-sm">PRESETS</span>
        <div className="flex gap-2 overflow-auto">
          <button>preset 1</button>
          <button>preset 2</button>
        </div>
        <span className="font-bold my-1 text-sm">EDITORS</span>
        <div className="grid grid-cols-[72px_auto] gap-2">
          Poiesis
          <input type="range" />
        </div>
        <div className="grid grid-cols-[72px_auto] gap-2">
          Hydra
          <input type="range" />
        </div>
        <div className="grid grid-cols-[72px_auto] gap-2">
          Strudel
          <input type="range" />
        </div>
        <span className="font-bold my-1 text-sm">GRAPHICS</span>
        <div className="grid grid-cols-[72px_auto] gap-2">
          Hydra
          <input type="range" />
        </div>
      </div>
    </>
  )
}
