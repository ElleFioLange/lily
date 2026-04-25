import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ReactNode, useCallback } from 'react'

export type HeaderProps = {
  title: string
  children?: ReactNode
}

// TODO need to figure out how to add horizontal scrolling
// basic solution causes problems with overflow: visible for the indicator https://stackoverflow.com/questions/6421966/css-overflow-x-visible-and-overflow-y-hidden-causing-scrollbar-issue

export default function Header({ title, children }: HeaderProps) {
  const { active, focused, setFocused, unloadPlugin } = usePluginsStore()

  const handleClose = useCallback(
    (e: React.MouseEvent, instanceId: string) => {
      e.stopPropagation()
      unloadPlugin(instanceId)
    },
    [unloadPlugin]
  )

  return (
    <div className="w-full h-8 bg-stone-900 border-b border-stone-700 flex p-1 z-10">
      <span className="shrink-0 px-4 text-base">{title.toUpperCase()}</span>
      <div className="grow flex gap-3 overflow-y-visible no-scrollbar">
        {Object.values(active).map(({ instanceId, manifest: { name } }) => (
          <div className="relative group flex items-center gap-1" key={instanceId}>
            <button
              className={`text-xs border-none bg-transparent ${instanceId === focused ? 'cursor-default' : 'hover:underline'}`}
              onClick={() => setFocused(instanceId)}
            >
              {name}
            </button>
            <button
              className="text-xs border-none bg-transparent opacity-0 group-hover:opacity-100 text-stone-400 hover:text-stone-100 leading-none px-0.5 -mt-px"
              onClick={(e) => handleClose(e, instanceId)}
              title="Close plugin"
            >
              ×
            </button>
            {instanceId === focused && (
              <svg
                preserveAspectRatio="none"
                height="8"
                viewBox="0 0 64 8"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-0 right-0 w-full top-6.75"
              >
                <path
                  d="M31.748 8C42.2299 8 51.9055 1 64 1V0H0V1C13.1024 1 21.2661 8 31.748 8Z"
                  fill="#D6D3D1"
                />
              </svg>
            )}
          </div>
        ))}
        {children}
      </div>
    </div>
  )
}
