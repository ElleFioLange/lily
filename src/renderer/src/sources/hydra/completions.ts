import {
  acceptCompletion,
  autocompletion,
  Completion,
  CompletionContext,
  CompletionResult,
  moveCompletionSelection
} from '@codemirror/autocomplete'
import { syntaxTree } from '@codemirror/language'
import { Prec, Extension } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import glslFunctions from 'hydra-synth/src/glsl/glsl-functions.js'

type HydraInput = { name: string; default?: unknown }
type HydraFunction = { name: string; type: string; inputs: HydraInput[] }

const KIND: Record<string, string> = {
  src: 'source',
  coord: 'geometry',
  color: 'color',
  combine: 'blend',
  combineCoord: 'modulate'
}

const signature = (inputs: HydraInput[]): string =>
  `(${inputs
    .map(({ name, default: value }) =>
      value === undefined || typeof value === 'object' ? name : `${name} = ${value}`
    )
    .join(', ')})`

const functions: HydraFunction[] = glslFunctions()

const asCompletion = ({ name, type, inputs }: HydraFunction): Completion => ({
  label: name,
  type: 'function',
  detail: signature(inputs),
  info: KIND[type]
})

/** Sources and other names a patch can start with */
const GLOBALS: Completion[] = [
  ...functions.filter(({ type }) => type === 'src').map(asCompletion),
  { label: 'src', type: 'function', detail: '(tex)', info: 'source: an output or s0–s3' },
  { label: 'solid', type: 'function', detail: '(r, g, b, a)', info: 'source' },
  { label: 'render', type: 'function', detail: '(output)', info: 'show one output, or all four' },
  { label: 'hush', type: 'function', detail: '()', info: 'clear every output' },
  { label: 'setResolution', type: 'function', detail: '(width, height)' },
  { label: 'setFunction', type: 'function', detail: '({ name, type, inputs, glsl })' },
  { label: 'loadScript', type: 'function', detail: '(url)', info: 'await it before use' },
  { label: 'update', type: 'variable', detail: '= (dt) => {}', info: 'runs every frame' },
  { label: 'time', type: 'variable' },
  { label: 'speed', type: 'variable' },
  { label: 'bpm', type: 'variable' },
  { label: 'fps', type: 'variable' },
  { label: 'mouse', type: 'variable', detail: '{ x, y }' },
  { label: 'width', type: 'variable' },
  { label: 'height', type: 'variable' },
  { label: 'a', type: 'variable', detail: 'audio', info: 'a.fft[0]…' },
  ...['o0', 'o1', 'o2', 'o3'].map((label) => ({ label, type: 'variable', info: 'output' })),
  ...['s0', 's1', 's2', 's3'].map((label) => ({ label, type: 'variable', info: 'external source' }))
]
// Names that are also chain methods (solid, src) are listed once
const seen = new Set<string>()
const GLOBAL_LIST = GLOBALS.filter(({ label }) => !seen.has(label) && seen.add(label))

/** Everything that chains after a source with `.` */
const CHAIN: Completion[] = [
  ...functions.filter(({ type }) => type !== 'src').map(asCompletion),
  { label: 'out', type: 'function', detail: '(output = o0)', info: 'send to an output' }
]

const SOURCE_METHODS: Completion[] = [
  { label: 'initCam', type: 'function', detail: '(index)' },
  { label: 'initImage', type: 'function', detail: '(url)' },
  { label: 'initVideo', type: 'function', detail: '(url)' },
  { label: 'initScreen', type: 'function', detail: '()' },
  { label: 'initStream', type: 'function', detail: '(name)' },
  { label: 'init', type: 'function', detail: '({ src })' },
  { label: 'clear', type: 'function', detail: '()' }
]

const AUDIO: Completion[] = [
  { label: 'fft', type: 'property', detail: '[bin]' },
  { label: 'setBins', type: 'function', detail: '(count)' },
  { label: 'setSmooth', type: 'function', detail: '(amount)' },
  { label: 'setCutoff', type: 'function', detail: '(level)' },
  { label: 'setScale', type: 'function', detail: '(range)' },
  { label: 'show', type: 'function', detail: '()' },
  { label: 'hide', type: 'function', detail: '()' }
]

const SKIP = new Set(['String', 'TemplateString', 'LineComment', 'BlockComment'])

/** Hydra's functions, chained methods and globals, with each function's arguments and defaults */
function hydraCompletions(context: CompletionContext): CompletionResult | null {
  const node = syntaxTree(context.state).resolveInner(context.pos, -1)
  if (SKIP.has(node.name)) return null
  const word = context.matchBefore(/[\w$]*/)
  if (!word) return null
  const before = context.state.sliceDoc(Math.max(0, word.from - 40), word.from)
  const member = /([\w$]+)?\s*\.\s*$/.exec(before)
  if (!member && word.from === word.to && !context.explicit) return null

  let options = GLOBAL_LIST
  if (member) {
    const object = member[1] ?? ''
    if (/^s[0-3]$/.test(object)) options = SOURCE_METHODS
    else if (object === 'a') options = AUDIO
    else if (/^o[0-3]$/.test(object)) return null
    else options = CHAIN
  }
  return { from: word.from, options, validFor: /^[\w$]*$/ }
}

/**
 * Autocomplete for Hydra in the editor: a list as you type, with each function's arguments.
 * Ctrl+N and Ctrl+P move through it (as do the arrow keys), Enter or Tab picks, Escape closes.
 * Ctrl+Space opens it anywhere.
 */
export const hydraAutocomplete: Extension = [
  autocompletion({ override: [hydraCompletions], icons: false }),
  // Ahead of the editor's own Ctrl+N and Ctrl+P (which do nothing) and Tab (indent); each
  // falls through when the list isn't open
  Prec.highest(
    keymap.of([
      { key: 'Ctrl-n', run: moveCompletionSelection(true) },
      { key: 'Ctrl-p', run: moveCompletionSelection(false) },
      { key: 'Tab', run: acceptCompletion }
    ])
  )
]
