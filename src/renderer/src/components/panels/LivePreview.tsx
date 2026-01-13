import { useRef, useEffect } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { defaultKeymap, history } from '@codemirror/commands'
import Panel from '../common/Panel'
import type { PanelId } from '../../stores/useFocusStore'
import { useInputStore } from '@renderer/stores/usePoiesisStore'

interface LivePreviewProps {
  panelId?: PanelId
}

export default function LivePreview({ panelId }: LivePreviewProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const input = useInputStore((state) => state.input)
  const setInput = useInputStore((state) => state.setInput)

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
      doc: input,
      extensions: [
        centeredTheme,
        EditorView.lineWrapping,
        history(),
        keymap.of(defaultKeymap),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString()
            setInput(newValue)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Update editor content when input changes from outside
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentValue = view.state.doc.toString()
    if (currentValue !== input) {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: input }
      })
    }
  }, [input])

  return (
    <Panel
      title="Live preview"
      contentClassName="flex items-center justify-center bg-stone-900 relative cursor-text"
      panelId={panelId}
      onClick={() => viewRef.current?.focus()}
    >
      <div ref={editorRef} className="w-full max-h-full overflow-auto outline-none relative" />
    </Panel>
  )
}
