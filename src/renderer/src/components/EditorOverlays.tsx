import { cssBlendMode } from '@renderer/graphics/blendModes'
import { MixerParams } from '@renderer/stores/useGraphicsStore'
import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { UIProps } from '@renderer/sources/types'

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
  const { getInstance } = useSourcesStore()

  return (
    <>
      {editorsOrder.map((id) => {
        const params = editors[id]
        if (!params?.enabled) return null
        const source = getInstance(id)
        if (source === undefined || source.Workspace === undefined) return null
        return (
          <div
            className="absolute size-full"
            key={id}
            style={{
              opacity: params.alpha,
              mixBlendMode: cssBlendMode(params.blendMode)
            }}
          >
            <source.Workspace instanceId={id} environment={environment} />
          </div>
        )
      })}
    </>
  )
}
