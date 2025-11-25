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
import { defaultKeymap, history, indentWithTab } from '@codemirror/commands'
import { yaml } from '@codemirror/lang-yaml'
import { foldGutter, foldKeymap, syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { search, searchKeymap } from '@codemirror/search'
import { tags } from '@lezer/highlight'
import * as jsyaml from 'js-yaml'

interface YAMLEditorProps {
  value: string
  onChange: (value: string) => void
  onTopLevelKeysChange?: (keys: string[]) => void
}

export interface YAMLEditorRef {
  scrollToKey: (key: string) => void
}

const YAMLEditor = forwardRef<YAMLEditorRef, YAMLEditorProps>(
  ({ value, onChange, onTopLevelKeysChange }, ref: ForwardedRef<YAMLEditorRef>) => {
    const editorRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)

    // Stone color theme for CodeMirror
    const stoneTheme = EditorView.theme({
      '&': {
        backgroundColor: '#1c1917', // stone-900
        // color: '#f5f5f4', // stone-100
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
      // YAML syntax highlighting
      '.cm-property': {
        color: '#d6d3d1' // stone-300 - YAML keys
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
        color: '#78716c', // stone-500 - comments
        fontStyle: 'italic'
      }
    })

    const highlightStyle = HighlightStyle.define([
      { tag: tags.string, color: '#6ee7b7' }, // emerald  300
      { tag: tags.number, color: '#c4b5fd' }, // violet 300
      { tag: tags.bool, color: '#fb7185' }, // rose 400
      { tag: tags.null, color: '#c4b5fd' }, // violet 300
      { tag: tags.brace, color: '#fcd34d' }, // amber 300
      { tag: tags.punctuation, color: '#38bdf8' } // sky 400
    ])

    // Extract top-level keys from YAML string
    const extractTopLevelKeys = useCallback((yamlString: string): string[] => {
      try {
        const parsed = jsyaml.load(yamlString)
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          return Object.keys(parsed).filter((key) => !key.startsWith('_comment'))
        }
      } catch {
        // Invalid YAML, return empty array
      }
      return []
    }, [])

    // Scroll to a specific key in the editor
    const scrollToKey = useCallback((key: string) => {
      const view = viewRef.current
      if (!view) return

      const doc = view.state.doc
      const searchPattern = `${key}:`

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
          yaml(),
          search(),
          stoneTheme,
          syntaxHighlighting(highlightStyle),
          EditorView.lineWrapping,
          history(),
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

YAMLEditor.displayName = 'YAMLEditor'

export default YAMLEditor
