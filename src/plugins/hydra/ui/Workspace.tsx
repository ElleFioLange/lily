import { useRef, useEffect } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, highlightActiveLine, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap, history, indentWithTab } from '@codemirror/commands'
import Panel from '@renderer/components/common/Panel'
import { PanelId } from '@renderer/stores/useFocusStore'
import { useHydraStore } from '../store'
import { javascript } from '@codemirror/lang-javascript'
import { search, searchKeymap } from '@codemirror/search'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
// import { useInputStore } from '@renderer/stores/useInputStore'

interface LivePreviewProps {
  panelId?: PanelId
}

// TODO history cmd+z still not working right
// TODO needs cursor navigation shortcuts, formatting, and search (? maybe search?)

export default function Workspace({ panelId }: LivePreviewProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const shader = useHydraStore((state) => state.shader)
  const setShader = useHydraStore((state) => state.setShader)
  const setScrollPercentage = useHydraStore((state) => state.setScrollPercentage)

  useEffect(
    () => {
      if (!editorRef.current) return

      // Stone color theme for CodeMirror
      const stoneTheme = EditorView.theme({
        '&': {
          // backgroundColor: '#1c191780', // stone-900/50
          height: '100%',
          fontSize: '14px'
        },
        '.cm-content': {
          caretColor: '#f5f5f4',
          fontFamily: 'Monaspace Neon',
          padding: '0'
        },
        '.cm-gutters': {
          backgroundColor: '#2925245a', // stone-800/35
          color: '#e7e5e4', // stone-400
          border: 'none',
          paddingRight: '8px'
        },
        '.cm-activeLineGutter': {
          backgroundColor: '#78716c80 !important' // stone-500/50
        },
        '.cm-lineNumbers .cm-gutterElement': {
          padding: '0 8px',
          minWidth: '32px'
        },
        '.cm-activeLine': {
          backgroundColor: '#78716cd0 !important' // stone-500/50
        },
        '& .cm-line': {
          backgroundColor: '#29252440' // stone-800/25
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
        { tag: tags.function(tags.variableName), color: '#22d3ee' }, // cyan-400
        { tag: tags.variableName, color: '#d6d3d1' }, // stone-300
        { tag: tags.comment, color: '#d6d3d1', fontStyle: 'italic' } // stone-300
      ])

      // Create editor state
      const startState = EditorState.create({
        doc: '',
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
              setShader(newValue)
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // Update editor content when input changes from outside
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentValue = view.state.doc.toString()
    if (currentValue !== shader) {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: shader }
      })
    }
  }, [shader])

  const handleScroll = () => {
    const editor = editorRef.current!
    const { clientHeight, scrollTop } = editor

    const container = editor.children[0]
    const containerHeight = container.clientHeight

    const maxScroll = containerHeight - clientHeight

    // From 0 to 1
    const scrollPercentage = scrollTop / maxScroll

    setScrollPercentage(scrollPercentage)
  }

  return (
    <Panel
      title="Live preview"
      className="size-full"
      contentClassName="size-full flex items-center justify-center relative cursor-text"
      panelId={panelId}
      onClick={() => viewRef.current?.focus()}
    >
      <div
        ref={editorRef}
        onWheel={handleScroll}
        onScroll={handleScroll}
        className="size-full overflow-auto outline-none relative border-t border-stone-400"
      />
    </Panel>
  )
}
