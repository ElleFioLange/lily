import { CSSProperties } from 'react'
import { MixerParams } from '@renderer/stores/useGraphicsStore'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { UIProps } from 'src/types/plugins'

type EditorOverlaysProps = {
  editors: Record<string, MixerParams>
  editorsOrder: string[]
  environment: NonNullable<UIProps['environment']>
}

/**
 * Stacks each enabled editor source's Workspace as a blended overlay, in mixer order.
 * Shared by the performance window and the preview stage so both render identically.
 */
export default function EditorOverlays({
  editors,
  editorsOrder,
  environment
}: EditorOverlaysProps) {
  const { getInstance } = usePluginsStore()

  return (
    <>
      {editorsOrder.map((id) => {
        const params = editors[id]
        if (!params?.enabled) return null
        const plugin = getInstance(id)
        if (plugin === undefined || plugin.Workspace === undefined) return null
        return (
          <div
            className="absolute size-full"
            key={id}
            style={{
              opacity: params.alpha,
              mixBlendMode: params.blendMode as CSSProperties['mixBlendMode']
            }}
          >
            <plugin.Workspace instanceId={id} environment={environment} />
          </div>
        )
      })}
    </>
  )
}
