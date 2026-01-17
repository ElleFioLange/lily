// TODO Dynamic imports of the plugins folder

import Header from './common/Header'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { useMemo } from 'react'

export default function Workspace() {
  const { active, focused, loadPlugin } = usePluginsStore()

  const focusedSurface = useMemo(() => {
    return Object.values(active).find(({ instanceId }) => instanceId === focused)
  }, [active, focused])

  return (
    <div className="size-full flex flex-col">
      <Header title="LILY">
        <button onClick={() => loadPlugin('hydra')}>+</button>
      </Header>
      <div className="relative grow">
        {focusedSurface === undefined ? (
          <div className="grid place-items-center">No surface selected</div>
        ) : (
          <>
            {/* Renderer layers (no interaction) */}
            {focusedSurface.Renderer ? (
              <div className="absolute size-full pointer-events-none">
                <focusedSurface.Renderer instanceId={focusedSurface.instanceId} />
              </div>
            ) : null}

            {/* Plugin main layers (interactable) */}
            {focusedSurface.Workspace ? (
              <div className="absolute size-full grid grid-rows-[min-content_auto]">
                <div className="w-full p-2 flex text-xs">
                  <button onClick={() => focusedSurface.process(focusedSurface.instanceId, '', {})}>
                    test
                  </button>
                </div>
                <div className="relative overflow-hidden">
                  <focusedSurface.Workspace instanceId={focusedSurface.instanceId} />
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
