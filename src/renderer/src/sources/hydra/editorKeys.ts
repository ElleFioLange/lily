import { EditorState, Extension } from '@codemirror/state'
import {
  EditorView,
  KeyBinding,
  crosshairCursor,
  drawSelection,
  rectangularSelection
} from '@codemirror/view'
import {
  addCursorAbove,
  addCursorBelow,
  cursorCharLeft,
  cursorCharRight,
  cursorLineDown,
  cursorLineUp,
  moveLineDown,
  moveLineUp,
  selectCharLeft,
  selectCharRight,
  selectLineDown,
  selectLineUp
} from '@codemirror/commands'

/**
 * Elle's VS Code cursor keys. Placed ahead of CodeMirror's defaults, so on a Mac they replace
 * its Emacs-style Ctrl-k (delete to line end) and Ctrl-l (select line).
 *   Ctrl+I/J/K/L            up, left, down, right
 *   Ctrl+Shift+I/J/K/L      the same, extending the selection
 *   Ctrl+Shift+Cmd+I/K      move the line (or selected lines) up or down
 */
export const cursorKeymap: KeyBinding[] = [
  { key: 'Ctrl-i', run: cursorLineUp, shift: selectLineUp, preventDefault: true },
  { key: 'Ctrl-j', run: cursorCharLeft, shift: selectCharLeft, preventDefault: true },
  { key: 'Ctrl-k', run: cursorLineDown, shift: selectLineDown, preventDefault: true },
  { key: 'Ctrl-l', run: cursorCharRight, shift: selectCharRight, preventDefault: true },
  { mac: 'Ctrl-Shift-Cmd-i', run: moveLineUp, preventDefault: true },
  { mac: 'Ctrl-Shift-Cmd-k', run: moveLineDown, preventDefault: true },
  // VS Code's add-cursor keys (Cmd+D for the next match comes with the search keymap)
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
