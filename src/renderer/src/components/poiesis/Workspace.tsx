import { useRef, useEffect } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { defaultKeymap, history } from '@codemirror/commands'
import { usePoiesisStore } from '@renderer/stores/usePoiesisStore'

export default function PoiesisWorkspace() {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const poiesis = usePoiesisStore((state) => state.poiesis)
  const setPoiesis = usePoiesisStore((state) => state.setPoiesis)

  useEffect(() => {
    if (!editorRef.current) return

    // Custom theme for centered, minimal text editor
    const centeredTheme = EditorView.theme({
      '&': {
        backgroundColor: 'transparent',
        height: '100%',
        fontSize: '24px'
      },
      '.cm-scroller': {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto'
      },
      '.cm-content': {
        caretColor: '#fafaf9',
        fontFamily: 'Monaspace Xenon',
        color: '#fafaf9',
        padding: '2rem',
        textAlign: 'center',
        whiteSpace: 'pre-wrap'
      },
      '.cm-line': {
        textAlign: 'center'
      },
      '.cm-cursor': {
        borderLeftColor: '#fafaf9'
      },
      '.cm-selectionBackground': {
        backgroundColor: '#44403c !important' // stone-700
      },
      '&.cm-focused .cm-selectionBackground': {
        backgroundColor: '#44403c !important'
      },
      '&.cm-focused': {
        outline: 'none'
      }
    })

    // Create editor state
    const startState = EditorState.create({
      doc: poiesis,
      extensions: [
        centeredTheme,
        EditorView.lineWrapping,
        history(),
        keymap.of(defaultKeymap),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString()
            setPoiesis(newValue)
          }
        })
      ]
    })

    // Create editor view
    const view = new EditorView({
      state: startState,
      parent: editorRef.current
    })

    viewRef.current = view

    // Cleanup
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, []) // Only run once on mount

  // Update editor content when poiesis changes from outside
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentValue = view.state.doc.toString()
    if (currentValue !== poiesis) {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: poiesis }
      })
    }
  }, [poiesis])

  return (
    <div className="size-full flex items-center relative cursor-text">
      <div ref={editorRef} className="w-full max-h-full overflow-auto outline-none relative" />
    </div>
  )
}
