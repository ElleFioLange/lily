import { useGraphicsStore } from '@renderer/stores/useGraphicsStore'
import Stage from './Stage'
import { TILE_CLASS, Tile } from './common/MonitorSection'

/** The live mix exactly as it goes to the performance window, whether or not that window is open. */
export default function ProgramMonitor() {
  const { compositorRef, editors, editorsOrder } = useGraphicsStore()
  return (
    <Tile caption="to performance window">
      <div className={`${TILE_CLASS} relative`}>
        <Stage
          compositor={compositorRef}
          outputId="program-monitor"
          editors={editors}
          editorsOrder={editorsOrder}
          environment="preview"
        />
      </div>
    </Tile>
  )
}
