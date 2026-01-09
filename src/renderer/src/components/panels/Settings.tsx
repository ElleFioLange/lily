import HydraPlugin from '@plugins/hydra'
import Header from '../common/Header'

export default function Settings() {
  return (
    <div>
      <Header
        options={['test 1al;kwjef;lakwejf;lawkejfrl;wa', 'test 2']}
        active="test 1al;kwjef;lakwejf;lawkejfrl;wa"
        title="SETTINGS"
        setActive={() => {}}
      />
      {HydraPlugin.Settings && <HydraPlugin.Settings />}
      {HydraPlugin.Renderer && <HydraPlugin.Renderer />}
    </div>
  )
}
