import { EditorState, Extension } from '@codemirror/state'
import {
  EditorView,
  KeyBinding,
  crosshairCursor,
  drawSelection,
  rectangularSelection
} from '@codemirror/view'
import { addCursorAbove, addCursorBelow } from '@codemirror/commands'
import { vscodeKeymap } from './vscodeKeys'
export { vscodeOptionKeys } from './vscodeKeys'

/**
 * The editor's VS Code keys: everything keybindings.json maps (cursor movement, selection,
 * lines, multiple cursors; see vscodeKeys.ts), then VS Code's default add-cursor keys. Placed
 * ahead of CodeMirror's defaults, so on a Mac they replace its Emacs-style Ctrl keys they reuse.
 * Cmd+D (add the next match) comes from keybindings.json too.
 */
export const cursorKeymap: KeyBinding[] = [
  ...vscodeKeymap,
  { key: 'Mod-Alt-ArrowUp', run: addCursorAbove, preventDefault: true },
  { key: 'Mod-Alt-ArrowDown', run: addCursorBelow, preventDefault: true }
]

/**
 * Multiple cursors, as in VS Code: Alt+click adds a cursor, Alt+Shift+drag selects a column,
 * Escape goes back to one cursor. drawSelection draws every cursor and selection.
 */
export const multipleCursors: Extension = [
  EditorState.allowMultipleSelections.of(true),
  drawSelection(),
  EditorView.clickAddsSelectionRange.of((event) => event.altKey && !event.shiftKey),
  rectangularSelection({ eventFilter: (event) => event.altKey && event.shiftKey }),
  crosshairCursor({ key: 'Alt' })
]
