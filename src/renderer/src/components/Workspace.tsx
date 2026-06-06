// TODO Dynamic imports of the plugins folder

import Header from './common/Header'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { useMemo, useState } from 'react'

function AddPlugin() {
  const [open, setOpen] = useState(false)
  const { registered, active, loadPlugin } = usePluginsStore()

  const availablePlugins = useMemo(() => {
    const activePluginIds = new Set(Object.values(active).map((p) => p.manifest.id))
    return Object.values(registered).filter(
      (plugin) => plugin.manifest.allowMultiple || !activePluginIds.has(plugin.manifest.id)
    )
  }, [registered, active])

  return (
    <div className="relative mt-1">
      {open ? (
        <ul className="w-40 absolute text-xs">
          {availablePlugins.map((plugin) => (
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
    console.log(focused, 'from workspace')
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
            {focusedSurface && focused && focusedSurface.Renderer ? (
              <div className="absolute size-full pointer-events-none">
                <focusedSurface.Renderer instanceId={focused} />
              </div>
            ) : null}

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
