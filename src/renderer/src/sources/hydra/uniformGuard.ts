type Uniforms = Record<string, unknown>
type OutputProto = { render: (passes: { uniforms: Uniforms }[]) => unknown }
const guarded = new WeakSet<object>()

/** What a uniform gets when its value is missing, as when an array holds `undefined` */
const FALLBACK = 0

/**
 * Keeps a patch's missing values from freezing its output. Hydra already gives a function that
 * returns no number its default, but array values aren't checked: `osc([x, y])` with `x` undefined
 * (say a variable only another patch defines) hands regl `undefined`. regl then throws in the
 * middle of drawing with a framebuffer still bound, and from then on every frame of that Hydra
 * instance draws into it, so the layer, monitor or preview freezes until Lily restarts, whatever
 * patch runs next. Here each changing uniform's value is checked as it's read, and a missing one
 * becomes 0. Hydra's outputs share one class, so patching it through any Hydra covers every Hydra
 * in the window.
 */
export function guardUniforms(hydra: { o?: object[] }): void {
  const output = hydra.o?.[0]
  const proto = output && (Object.getPrototypeOf(output) as OutputProto)
  if (!proto || guarded.has(proto)) return
  guarded.add(proto)
  const render = proto.render
  proto.render = function (this: unknown, passes) {
    const safe = passes.map((pass) => ({
      ...pass,
      uniforms: Object.fromEntries(
        Object.entries(pass.uniforms).map(([name, value]) => [
          name,
          typeof value === 'function' && !('_reglType' in value)
            ? (...args: unknown[]) => {
                const result = (value as (...a: unknown[]) => unknown)(...args)
                return result === undefined ||
                  result === null ||
                  typeof result === 'string' ||
                  typeof result === 'boolean'
                  ? FALLBACK
                  : result
              }
            : value
        ])
      )
    }))
    return render.call(this, safe)
  }
}
