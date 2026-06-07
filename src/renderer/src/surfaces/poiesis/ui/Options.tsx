import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin, UIProps } from 'src/types/plugins'
import { PoiesisState } from '../store'
import FileSystem from '@renderer/components/FileSystem'

const testFiles = {
  test: {
    name: 'test',
    path: 'test',
    content: 'test',
    extension: 'js' as 'js' | 'txt'
  },
  test1: {
    name: 'test1',
    path: 'test1',
    content: 'test1',
    extension: 'txt' as 'js' | 'txt'
  },
  test2: {
    name: 'test2',
    path: 'test2',
    content: 'test2',
    extension: 'txt' as 'js' | 'txt'
  },
  test3: {
    name: 'test3',
    path: 'test3',
    content: 'test3',
    extension: 'txt' as 'js' | 'txt'
  }
}

export default function Options({ instanceId }: UIProps) {
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<PoiesisState>
  const { openSurface, setOpenSurface } = instance.useStore()

  const handleOpen = async () => {
    const { openConfig } = instance.useStore.getState()
    await openConfig()
  }

  return (
    <div>
      <button onClick={() => setOpenSurface(openSurface === 'poiesis' ? 'config' : 'poiesis')}>
        {openSurface}
      </button>
      <FileSystem className="border-none p-4" handleOpen={handleOpen} files={testFiles} />
    </div>
  )
}
