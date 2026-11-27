import { formatWithCursor } from 'prettier/standalone'
import type { Options } from 'prettier'
import babel from 'prettier/plugins/babel'
import estree from 'prettier/plugins/estree'
import { useSourcesStore } from '@renderer/stores/useSourcesStore'
import { ActiveSource } from '@renderer/sources/types'
import { HydraState } from './store'
import { editorView } from './editorViews'

// The repo's own Prettier style, so patches in the working folder read like the code around them
const OPTIONS: Options = {
  parser: 'babel',
  plugins: [babel, estree],
  singleQuote: true,
  semi: false,
  printWidth: 80,
  trailingComma: 'none'
}

/** Formats patch code with Prettier. Returns null when it can't be parsed, so it's left as is. */
export async function formatCode(
  code: string,
  cursorOffset = 0
): Promise<{ formatted: string; cursorOffset: number } | null> {
  if (!code.trim()) return null
  try {
    return await formatWithCursor(code, { ...OPTIONS, cursorOffset })
  } catch {
    return null
  }
}

/**
 * Formats a Hydra layer's patch in place. In its open editor the change is one undoable step and
 * the cursor stays on the same code; otherwise the layer's stored text is replaced. Code with a
 * syntax error is left alone.
 */
export async function formatLayer(instanceId: string): Promise<void> {
  const layer = useSourcesStore.getState().active[instanceId] as
    | ActiveSource<HydraState>
    | undefined
  if (layer?.manifest.id !== 'hydra') return

  const view = editorView(instanceId)
  if (view) {
    const before = view.state.doc.toString()
    const result = await formatCode(before, view.state.selection.main.head)
    // Skip if it didn't parse, changed nothing, or was edited while formatting
    if (!result || result.formatted === before || view.state.doc.toString() !== before) return
    view.dispatch({
      changes: { from: 0, to: before.length, insert: result.formatted },
      selection: { anchor: Math.min(result.cursorOffset, result.formatted.length) },
      userEvent: 'input.format'
    })
    return
  }

  const { shader, setShader } = layer.useStore.getState()
  const result = await formatCode(shader)
  if (result && result.formatted !== shader && layer.useStore.getState().shader === shader) {
    setShader(result.formatted)
  }
}

/** Format Patch (Cmd/Ctrl+F): formats the focused layer's patch. */
export function formatFocused(): Promise<void> {
  const { focused } = useSourcesStore.getState()
  return focused ? formatLayer(focused) : Promise.resolve()
}
