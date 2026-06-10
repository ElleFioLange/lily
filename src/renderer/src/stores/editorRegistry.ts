import type { EditorView } from '@codemirror/view'

let activeView: EditorView | null = null

export const editorRegistry = {
  set: (view: EditorView | null) => {
    activeView = view
  },
  get: (): EditorView | null => activeView
}
