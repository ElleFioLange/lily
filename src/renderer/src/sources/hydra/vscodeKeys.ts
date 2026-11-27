import { EditorSelection, Extension, Prec, StateCommand } from '@codemirror/state'
import { Command, EditorView, KeyBinding } from '@codemirror/view'
import {
  addCursorAbove,
  addCursorBelow,
  copyLineDown,
  copyLineUp,
  cursorCharLeft,
  cursorCharRight,
  cursorDocEnd,
  cursorDocStart,
  cursorGroupLeft,
  cursorGroupRight,
  cursorLineBoundaryBackward,
  cursorLineBoundaryForward,
  cursorLineDown,
  cursorLineEnd,
  cursorLineStart,
  cursorLineUp,
  cursorPageDown,
  cursorPageUp,
  deleteCharBackward,
  deleteCharForward,
  deleteGroupBackward,
  deleteGroupForward,
  deleteLine,
  indentLess,
  indentMore,
  moveLineDown,
  moveLineUp,
  selectAll,
  selectCharLeft,
  selectCharRight,
  selectDocEnd,
  selectDocStart,
  selectGroupLeft,
  selectGroupRight,
  selectLine,
  selectLineBoundaryBackward,
  selectLineBoundaryForward,
  selectLineDown,
  selectLineEnd,
  selectLineStart,
  selectLineUp,
  selectPageDown,
  selectPageUp,
  selectParentSyntax,
  toggleComment
} from '@codemirror/commands'
import { selectNextOccurrence } from '@codemirror/search'
import keybindingsSource from './keybindings.json?raw'

/**
 * Reads VS Code keybindings (keybindings.json, comments and trailing commas allowed) into
 * CodeMirror key bindings for the Hydra editor. Only editing commands CodeMirror can do are
 * taken: cursor movement, selection, lines and multiple cursors. Workbench, git, terminal and
 * other commands are skipped, and so is any key Lily itself uses (see LILY_KEYS). As in VS Code,
 * a later entry for the same key wins, and "-command" turns a binding off.
 */

type Run = Command | StateCommand

/**
 * Expand Selection steps, so Shrink Selection can step back: the selection before each expand
 * and the one it made. Shrinking only steps back while the selection is still the expanded one.
 */
const expandHistory = new WeakMap<
  EditorView,
  { before: EditorSelection; after: EditorSelection }[]
>()

const expandSelection: Command = (view) => {
  const before = view.state.selection
  if (!selectParentSyntax(view)) return false
  const stack = expandHistory.get(view) ?? []
  const last = stack.at(-1)
  // Start over if the selection moved some other way since the last expand
  const steps = last && last.after.eq(before) ? stack : []
  steps.push({ before, after: view.state.selection })
  expandHistory.set(view, steps)
  return true
}

const shrinkSelection: Command = (view) => {
  const steps = expandHistory.get(view)
  const last = steps?.at(-1)
  if (!steps || !last || !last.after.eq(view.state.selection)) return false
  steps.pop()
  view.dispatch({ selection: last.before, scrollIntoView: true })
  return true
}

const changeCase =
  (upper: boolean): StateCommand =>
  ({ state, dispatch }) => {
    if (state.readOnly || state.selection.ranges.every((r) => r.empty)) return false
    dispatch(
      state.update(
        state.changeByRange((range) => {
          const text = state.sliceDoc(range.from, range.to)
          return {
            changes: {
              from: range.from,
              to: range.to,
              insert: upper ? text.toUpperCase() : text.toLowerCase()
            },
            range
          }
        }),
        { userEvent: 'input' }
      )
    )
    return true
  }

/** VS Code's $CURSOR_NUMBER snippet: types 1, 2, 3... at the cursors, top to bottom. */
const insertCursorNumbers: StateCommand = ({ state, dispatch }) => {
  if (state.readOnly) return false
  let n = 0
  dispatch(
    state.update(
      state.changeByRange((range) => {
        const insert = String(++n)
        return {
          changes: { from: range.from, to: range.to, insert },
          range: EditorSelection.cursor(range.from + insert.length)
        }
      }),
      { userEvent: 'input' }
    )
  )
  return true
}

/** VS Code command id → CodeMirror command */
const COMMANDS: Record<string, Run> = {
  cursorUp: cursorLineUp,
  cursorDown: cursorLineDown,
  cursorLeft: cursorCharLeft,
  cursorRight: cursorCharRight,
  cursorUpSelect: selectLineUp,
  cursorDownSelect: selectLineDown,
  cursorLeftSelect: selectCharLeft,
  cursorRightSelect: selectCharRight,
  cursorWordLeft: cursorGroupLeft,
  cursorWordRight: cursorGroupRight,
  cursorWordStartLeft: cursorGroupLeft,
  cursorWordEndRight: cursorGroupRight,
  cursorWordLeftSelect: selectGroupLeft,
  cursorWordRightSelect: selectGroupRight,
  cursorWordStartLeftSelect: selectGroupLeft,
  cursorWordEndRightSelect: selectGroupRight,
  // VS Code's Home goes to the first non-blank character first, as these do
  cursorHome: cursorLineBoundaryBackward,
  cursorEnd: cursorLineBoundaryForward,
  cursorHomeSelect: selectLineBoundaryBackward,
  cursorEndSelect: selectLineBoundaryForward,
  cursorLineStart: cursorLineStart,
  cursorLineEnd: cursorLineEnd,
  cursorLineStartSelect: selectLineStart,
  cursorLineEndSelect: selectLineEnd,
  cursorTop: cursorDocStart,
  cursorBottom: cursorDocEnd,
  cursorTopSelect: selectDocStart,
  cursorBottomSelect: selectDocEnd,
  cursorPageUp: cursorPageUp,
  cursorPageDown: cursorPageDown,
  cursorPageUpSelect: selectPageUp,
  cursorPageDownSelect: selectPageDown,
  'editor.action.selectAll': selectAll,
  expandLineSelection: selectLine,
  'editor.action.smartSelect.expand': expandSelection,
  'editor.action.smartSelect.shrink': shrinkSelection,
  'editor.action.moveLinesUpAction': moveLineUp,
  'editor.action.moveLinesDownAction': moveLineDown,
  'editor.action.copyLinesUpAction': copyLineUp,
  'editor.action.copyLinesDownAction': copyLineDown,
  'editor.action.deleteLines': deleteLine,
  'editor.action.indentLines': indentMore,
  'editor.action.outdentLines': indentLess,
  'editor.action.commentLine': toggleComment,
  'editor.action.insertCursorAbove': addCursorAbove,
  'editor.action.insertCursorBelow': addCursorBelow,
  'editor.action.addSelectionToNextFindMatch': selectNextOccurrence,
  'editor.action.transformToUppercase': changeCase(true),
  'editor.action.transformToLowercase': changeCase(false),
  deleteLeft: deleteCharBackward,
  deleteRight: deleteCharForward,
  deleteWordLeft: deleteGroupBackward,
  deleteWordRight: deleteGroupForward
}

/** Keys Lily keeps for itself (menu and editor shortcuts), never taken by a VS Code binding */
const LILY_KEYS = new Set([
  'Mod-Enter',
  'Mod-Shift-Enter',
  'Mod-Alt-Enter',
  'Mod-n',
  'Mod-w',
  'Mod-o',
  'Mod-Alt-o',
  'Mod-s',
  'Mod-Shift-s',
  'Mod-p',
  'Mod-Shift-o',
  'Mod-Alt-p',
  'Mod-Shift-p',
  'Mod-Shift-f',
  'Ctrl-Tab',
  'Ctrl-Shift-Tab'
])

const KEY_NAMES: Record<string, string> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  enter: 'Enter',
  tab: 'Tab',
  escape: 'Escape',
  backspace: 'Backspace',
  delete: 'Delete',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  space: 'Space'
}

const MODIFIERS: Record<string, string> = {
  ctrl: 'Ctrl',
  shift: 'Shift',
  alt: 'Alt',
  cmd: 'Mod',
  meta: 'Mod',
  win: 'Meta'
}
const MODIFIER_ORDER = ['Mod', 'Ctrl', 'Alt', 'Shift', 'Meta']

/** "ctrl+shift+cmd+i" → "Mod-Ctrl-Shift-i"; a chord like "cmd+k cmd+h" → "Mod-k Mod-h" */
function toCodeMirrorKey(vscodeKey: string): string | null {
  const strokes = vscodeKey.trim().toLowerCase().split(/\s+/)
  const converted = strokes.map((stroke) => {
    const parts = stroke.split('+')
    const base = parts.pop()
    if (!base) return null
    const mods = new Set<string>()
    for (const part of parts) {
      const mod = MODIFIERS[part]
      if (!mod) return null
      mods.add(mod)
    }
    const name = KEY_NAMES[base] ?? (base.length === 1 ? base : null)
    if (!name) return null
    return [...MODIFIER_ORDER.filter((m) => mods.has(m)), name].join('-')
  })
  return converted.every(Boolean) ? converted.join(' ') : null
}

type Entry = { key?: unknown; command?: unknown; args?: unknown }

/** Parses JSON with comments and trailing commas, as VS Code writes it. */
export function parseJsonc(text: string): unknown {
  let out = ''
  let inString = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inString) {
      out += c
      if (c === '\\') out += text[++i] ?? ''
      else if (c === '"') inString = false
    } else if (c === '"') {
      inString = true
      out += c
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++
      out += '\n'
    } else if (c === '/' && text[i + 1] === '*') {
      i = text.indexOf('*/', i + 2)
      if (i === -1) break
      i++
    } else out += c
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'))
}

function commandFor(entry: Entry): Run | null {
  if (typeof entry.command !== 'string') return null
  if (entry.command === 'editor.action.insertSnippet') {
    const snippet = (entry.args as { snippet?: unknown } | undefined)?.snippet
    return snippet === '$CURSOR_NUMBER' ? insertCursorNumbers : null
  }
  return COMMANDS[entry.command] ?? null
}

// CodeMirror's own Emacs-style keys on macOS, as the VS Code commands they match, so turning
// one off in keybindings.json turns off the CodeMirror one too
const EMACS_DEFAULTS: Record<string, string> = {
  'Ctrl-b': 'cursorLeft',
  'Ctrl-f': 'cursorRight',
  'Ctrl-p': 'cursorUp',
  'Ctrl-n': 'cursorDown',
  'Ctrl-a': 'cursorLineStart',
  'Ctrl-e': 'cursorLineEnd',
  'Ctrl-d': 'deleteRight',
  'Ctrl-h': 'deleteLeft',
  'Ctrl-k': 'deleteAllRight',
  'Ctrl-o': 'lineBreakInsert',
  'Ctrl-t': 'editor.action.transposeLetters',
  'Ctrl-v': 'cursorPageDown'
}

const swallow: Command = () => true

export type VSCodeKeys = {
  keymap: KeyBinding[]
  /**
   * Option-only keys (like Alt+Shift+I), matched by the physical key. On macOS those type a
   * character (ˆ), so CodeMirror's keymap never sees them as Alt+Shift+I.
   */
  optionKeys: Map<string, Run>
}

// "Alt-Shift-i" → "Alt-Shift-KeyI" (the event's physical key code)
function optionKeyCode(key: string): string | null {
  const match = /^(Alt-(?:Shift-)?)([a-z0-9])$/.exec(key)
  if (!match) return null
  const [, mods, ch] = match
  return mods + (/[a-z]/.test(ch) ? `Key${ch.toUpperCase()}` : `Digit${ch}`)
}

/** Converts VS Code keybindings into CodeMirror key bindings. */
export function readVSCodeKeybindings(text: string): VSCodeKeys {
  const parsed = parseJsonc(text)
  const optionKeys = new Map<string, Run>()
  if (!Array.isArray(parsed)) return { keymap: [], optionKeys }

  // Last entry for a key wins, as in VS Code
  const bound = new Map<string, Run>()
  const unbound = new Set<string>()
  for (const entry of parsed as Entry[]) {
    if (typeof entry.key !== 'string' || typeof entry.command !== 'string') continue
    const key = toCodeMirrorKey(entry.key)
    if (!key || LILY_KEYS.has(key)) continue
    if (entry.command.startsWith('-')) {
      const removed = entry.command.slice(1)
      if (bound.get(key) === COMMANDS[removed]) bound.delete(key)
      if (EMACS_DEFAULTS[key] === removed) unbound.add(key)
      continue
    }
    const run = commandFor(entry)
    if (run) bound.set(key, run)
  }

  const bindings: KeyBinding[] = []
  for (const [key, run] of bound) {
    const code = optionKeyCode(key)
    if (code) optionKeys.set(code, run)
    else bindings.push({ key, run: run as Command, preventDefault: true })
  }
  // A default they turned off and didn't rebind does nothing, instead of CodeMirror's command
  for (const key of unbound) {
    if (!bound.has(key)) bindings.push({ mac: key, run: swallow, preventDefault: true })
  }
  return { keymap: bindings, optionKeys }
}

/** The bindings from keybindings.json next to this file */
const fromFile: VSCodeKeys = (() => {
  try {
    return readVSCodeKeybindings(keybindingsSource)
  } catch (error) {
    console.error('[hydra editor] could not read keybindings.json:', error)
    return { keymap: [], optionKeys: new Map() }
  }
})()

export const vscodeKeymap: KeyBinding[] = fromFile.keymap

/** Runs keybindings.json's Option-only keys, ahead of typing and the keymap. */
export const vscodeOptionKeys: Extension = Prec.highest(
  EditorView.domEventHandlers({
    keydown(event, view) {
      if (!event.altKey || event.ctrlKey || event.metaKey) return false
      const run = fromFile.optionKeys.get(`Alt-${event.shiftKey ? 'Shift-' : ''}${event.code}`)
      if (!run || !(run as Command)(view)) return false
      event.preventDefault()
      return true
    }
  })
)
