import {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
  ForwardedRef
} from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { json } from '@codemirror/lang-json'
import { foldGutter, foldKeymap } from '@codemirror/language'
import { search, searchKeymap } from '@codemirror/search'

interface JSONEditorProps {
  value: string
  onChange: (value: string) => void
  onTopLevelKeysChange?: (keys: string[]) => void
}

export interface JSONEditorRef {
  scrollToKey: (key: string) => void
}

const JSONEditor = forwardRef<JSONEditorRef, JSONEditorProps>(
  ({ value, onChange, onTopLevelKeysChange }, ref: ForwardedRef<JSONEditorRef>) => {
    const editorRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)

    // Stone color theme for CodeMirror
    const stoneTheme = EditorView.theme({
      '&': {
        backgroundColor: '#1c1917', // stone-900
        color: '#f5f5f4', // stone-100
        height: '100%',
        fontSize: '14px'
      },
      '.cm-content': {
        caretColor: '#f5f5f4',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
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
      '.cm-foldGutter': {
        padding: '0 4px'
      },
      '.cm-foldPlaceholder': {
        backgroundColor: '#44403c', // stone-700
        border: 'none',
        color: '#a8a29e'
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
      },
      // JSON syntax highlighting
      '.cm-property': {
        color: '#d6d3d1' // stone-300 - JSON keys
      },
      '.cm-string': {
        color: '#a8a29e' // stone-400 - string values
      },
      '.cm-number': {
        color: '#78716c' // stone-500 - numbers
      },
      '.cm-bool, .cm-null': {
        color: '#78716c' // stone-500 - booleans and null
      },
      '.cm-punctuation': {
        color: '#57534e' // stone-600 - brackets, colons, commas
      },
      '.cm-comment': {
        color: '#78716c', // stone-500 - comments (if supported)
        fontStyle: 'italic'
      }
    })

    // Extract top-level keys from JSON string
    const extractTopLevelKeys = useCallback((jsonString: string): string[] => {
      try {
        const parsed = JSON.parse(jsonString)
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          return Object.keys(parsed).filter((key) => !key.startsWith('_comment'))
        }
      } catch {
        // Invalid JSON, return empty array
      }
      return []
    }, [])

    // Scroll to a specific key in the editor
    const scrollToKey = useCallback((key: string) => {
      const view = viewRef.current
      if (!view) return

      const doc = view.state.doc
      const searchPattern = `"${key}":`

      // Search through the document for the key
      for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
        const line = doc.line(lineNum)
        if (line.text.includes(searchPattern)) {
          // Found the key, scroll to it
          view.dispatch({
            effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 20 })
          })
          // Set cursor to this position
          view.dispatch({
            selection: { anchor: line.from }
          })
          view.focus()
          break
        }
      }
    }, [])

    // Expose scrollToKey method to parent via ref
    useImperativeHandle(ref, () => ({
      scrollToKey
    }))

    useEffect(() => {
      if (!editorRef.current) return

      // Create editor state
      const startState = EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          foldGutter(),
          json(),
          search(),
          stoneTheme,
          EditorView.lineWrapping,
          keymap.of([...defaultKeymap, ...foldKeymap, ...searchKeymap, indentWithTab]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const newValue = update.state.doc.toString()
              onChange(newValue)

              // Extract and emit top-level keys
              if (onTopLevelKeysChange) {
                const keys = extractTopLevelKeys(newValue)
                onTopLevelKeysChange(keys)
              }
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

      // Extract initial keys
      if (onTopLevelKeysChange) {
        const keys = extractTopLevelKeys(value)
        onTopLevelKeysChange(keys)
      }

      // Cleanup
      return () => {
        view.destroy()
        viewRef.current = null
      }
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

        // Extract and emit top-level keys
        if (onTopLevelKeysChange) {
          const keys = extractTopLevelKeys(value)
          onTopLevelKeysChange(keys)
        }
      }
    }, [value, onTopLevelKeysChange, extractTopLevelKeys])

    return <div ref={editorRef} className="h-full w-full overflow-hidden" />
  }
)

JSONEditor.displayName = 'JSONEditor'

export default JSONEditor
