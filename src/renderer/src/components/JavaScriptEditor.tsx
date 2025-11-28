import { useRef, useEffect, forwardRef } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, history, indentWithTab } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { search, searchKeymap } from '@codemirror/search'
import { tags } from '@lezer/highlight'

interface JavaScriptEditorProps {
  value: string
  onChange: (value: string) => void
}

export interface JavaScriptEditorRef {
  focus: () => void
}

const JavaScriptEditor = forwardRef<JavaScriptEditorRef, JavaScriptEditorProps>(
  ({ value, onChange }) => {
    const editorRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)

    // Stone color theme for CodeMirror
    const stoneTheme = EditorView.theme({
      '&': {
        backgroundColor: '#1c1917', // stone-900
        height: '100%',
        fontSize: '14px'
      },
      '.cm-content': {
        caretColor: '#f5f5f4',
        fontFamily: 'Monaspace Neon',
        padding: '8px 0'
      },
      '.cm-gutters': {
        backgroundColor: '#292524', // stone-800
        color: '#a8a29e', // stone-400
        border: 'none',
        paddingRight: '8px'
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#292524'
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 8px',
        minWidth: '32px'
      },
      '.cm-activeLine': {
        backgroundColor: '#292524' // stone-800
      },
      '.cm-selectionBackground': {
        backgroundColor: '#44403c !important' // stone-700
      },
      '&.cm-focused .cm-selectionBackground': {
        backgroundColor: '#44403c !important'
      },
      '.cm-cursor': {
        borderLeftColor: '#f5f5f4'
      }
    })

    const highlightStyle = HighlightStyle.define([
      { tag: tags.keyword, color: '#fb7185' }, // rose-400
      { tag: tags.string, color: '#6ee7b7' }, // emerald-300
      { tag: tags.number, color: '#c4b5fd' }, // violet-300
      { tag: tags.bool, color: '#fb7185' }, // rose-400
      { tag: tags.null, color: '#c4b5fd' }, // violet-300
      { tag: tags.operator, color: '#38bdf8' }, // sky-400
      { tag: tags.punctuation, color: '#fcd34d' }, // amber-300
      { tag: tags.function(tags.variableName), color: '#a78bfa' }, // violet-400
      { tag: tags.variableName, color: '#d6d3d1' }, // stone-300
      { tag: tags.comment, color: '#78716c', fontStyle: 'italic' } // stone-500
    ])

    useEffect(() => {
      if (!editorRef.current) return

      // Create editor state
      const startState = EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          javascript(),
          search(),
          stoneTheme,
          syntaxHighlighting(highlightStyle),
          EditorView.lineWrapping,
          history(),
          keymap.of([...defaultKeymap, ...searchKeymap, indentWithTab]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const newValue = update.state.doc.toString()
              onChange(newValue)
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

    // Update editor content when value prop changes from outside
    useEffect(() => {
      const view = viewRef.current
      if (!view) return

      const currentValue = view.state.doc.toString()
      if (currentValue !== value) {
        view.dispatch({
          changes: { from: 0, to: currentValue.length, insert: value }
        })
      }
    }, [value])

    return <div ref={editorRef} className="h-full w-full overflow-hidden" />
  }
)

JavaScriptEditor.displayName = 'JavaScriptEditor'

export default JavaScriptEditor
