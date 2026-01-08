import * as Hydra from '@plugins/hydra'
import Header from '../common/Header'

export default function Monitors() {
  return (
    <div>
      <Header
        options={['test 1', 'test 2']}
        active="test 1"
        title="MONITORS"
        setActive={() => {}}
      />
      <Hydra.Monitor />
    </div>
  )
}
