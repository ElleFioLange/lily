// TODO Dynamic imports of the plugins folder

import Header from './common/Header'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { useMemo, useState } from 'react'

function AddPlugin() {
  const [open, setOpen] = useState(false)
  const { registered, loadPlugin } = usePluginsStore()
  return (
    <div className="relative mt-1">
      {open ? (
        <ul className="w-40 absolute text-xs">
          {Object.values(registered).map((plugin) => (
            <li
              className="top-0 left-0 w-full text-left block"
              key={plugin.manifest.id}
              onClick={() => {
                loadPlugin(plugin.manifest.id)
                setOpen(false)
              }}
            >
              {plugin.manifest.name}
            </li>
          ))}
        </ul>
      ) : (
        <button
          className="size-4.5 p-0 flex justify-center items-center place-self-center my-auto"
          onClick={() => setOpen(true)}
        >
          +
        </button>
      )}
    </div>
  )
}

export default function Workspace() {
  const { active, focused } = usePluginsStore()

  const focusedSurface = useMemo(() => {
    return Object.values(active).find(({ instanceId }) => instanceId === focused)
  }, [active, focused])

  return (
    <div className="size-full flex flex-col">
      <Header title="LILY">
        <AddPlugin />
      </Header>
      <div className="relative grow">
        {focusedSurface === undefined ? (
          <div className="grid place-items-center">No surface selected</div>
        ) : (
          <>
            {/* Renderer layers (no interaction) */}
            {Object.values(active).map(({ instanceId, Renderer }) =>
              Renderer ? (
                <div key={instanceId} className="absolute size-full pointer-events-none">
                  <Renderer instanceId={instanceId} />
                </div>
              ) : null
            )}

            {/* Plugin main layers (interactable) */}
            {focusedSurface.Workspace ? (
              <div className="absolute size-full overflow-hidden">
                <focusedSurface.Workspace
                  key={focusedSurface.instanceId}
                  instanceId={focusedSurface.instanceId}
                  environment="main"
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
