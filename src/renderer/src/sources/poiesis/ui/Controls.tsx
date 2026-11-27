import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { ActiveSource, UIProps } from '@renderer/sources/types'
import { PoiesisState } from '../store'

export default function Controls({ instanceId }: UIProps) {
  const { getInstance } = useSourcesStore()
  const instance = getInstance(instanceId) as ActiveSource<PoiesisState>
  const { openSurface, setOpenSurface } = instance.useStore()

  const handleOpen = async () => {
    const { openConfig } = instance.useStore.getState()
    await openConfig()
  }

  return (
    <div className="p-4 flex gap-2">
      <button onClick={() => setOpenSurface(openSurface === 'poiesis' ? 'config' : 'poiesis')}>
        {openSurface}
      </button>
      <button onClick={handleOpen}>Open config</button>
    </div>
  )
}
