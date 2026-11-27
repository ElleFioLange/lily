import { EditorView } from '@codemirror/view'

/** The main-window editor of each Hydra layer, while it's mounted, so actions can edit in place. */
const views = new Map<string, EditorView>()

export function registerEditorView(instanceId: string, view: EditorView): () => void {
  views.set(instanceId, view)
  return () => {
    if (views.get(instanceId) === view) views.delete(instanceId)
  }
}

export function editorView(instanceId: string): EditorView | undefined {
  return views.get(instanceId)
}
