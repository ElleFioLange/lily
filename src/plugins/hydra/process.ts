import { ConfigurationJSON } from 'src/types/config'
import { useHydraStore } from './store'
import loadScript from '@renderer/utils/loadScript'

export default async function process(poiesis: string, config: ConfigurationJSON) {
  const shader = `
  osc(1, 1, 1)
	.modulatePixelate(src(o0)
		.rotate(0, 1))
	.modulateRotate(src(o0))
	.contrast(0.2)
	.saturate(1.2)
	.brightness(0.2)
	.diff(src(o0)
		.rotate(Math.PI / 2))
	.out()

src(o0)
	.modulate(src(o1))
	.mult(voronoi())
	.modulateScale(voronoi())
	.out(o1)

src(o2)
// 	.brightness(() => a.fft[0] * -0.12 - 0.05)
	.brightness(-0.05)
	.scale(1.01)
	.add(src(o1)
		.scroll(() => Math.sin(time / 3), () => Math.cos(time / 4))
		.rotate(() => Math.sin(time / 2) + Math.cos(time / 5)).modulateScale(noise(3)),
//          () => Math.min(a.fft[0], 0.7) * 0.5 + 0.2)
         0.3)
	.modulate(src(o2))
	.out(o2)

src(o2).add(src(o2), 3).out(o3)
render(o3)
  `

  const hydra = useHydraStore.getState().hydra
  const synth = hydra.synth

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor

  // Create function with all Hydra methods in scope
  const evalFunc = new AsyncFunction(...Object.keys(synth), 'synth', 'loadScript', shader)
  evalFunc(...Object.values(synth), synth, loadScript)
  console.log('Shader evaluated successfully')
}
