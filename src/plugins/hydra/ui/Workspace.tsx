import { useRef, useEffect } from 'react'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, highlightActiveLine, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap, history, indentWithTab } from '@codemirror/commands'
import Panel from '@renderer/components/common/Panel'
import { javascript } from '@codemirror/lang-javascript'
import { search, searchKeymap } from '@codemirror/search'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin } from '@plugins/utils'
import { HydraState } from '../store'
import { WorkspaceProps } from 'src/types/plugins'

// TODO history cmd+z still not working right
// TODO needs cursor navigation shortcuts, formatting, and search (? maybe search?)
// TODO handle the extra HTMLDivProps from the

const MAIN_FONT_SIZE = 14

const fontSizeTheme = (fontSize: number) => EditorView.theme({ '&': { fontSize: `${fontSize}px` } })

export default function Workspace({ instanceId, environment }: WorkspaceProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const fontSizeCompartment = useRef(new Compartment())
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<HydraState>
  const { shader, setShader, setScrollPercentage, performanceText } = instance.useStore()
  const isPerformance = environment === 'performance'
  const fontSize = isPerformance ? performanceText.fontSize : MAIN_FONT_SIZE

  useEffect(
    () => {
      if (!editorRef.current) return

      // Stone color theme for CodeMirror
      const hydraTheme = EditorView.theme({
        '&': {
          height: '100%'
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
        '.cm-lineNumbers .cm-gutterElement': {
          padding: '0 8px',
          minWidth: '32px'
        },
        '.cm-activeLine': {
          backgroundColor: '#78716cd0 !important' // stone-500/75
        },
        '& .cm-line': {
          width: 'fit-content',
          backgroundColor: '#29252480' // stone-800/50
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
        { tag: tags.function(tags.propertyName), color: '#a3e635' }, // lime-400
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
          hydraTheme,
          fontSizeCompartment.current.of(fontSizeTheme(fontSize)),
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

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: fontSizeCompartment.current.reconfigure(fontSizeTheme(fontSize))
    })
  }, [fontSize])

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
      onClick={() => viewRef.current?.focus()}
    >
      <div
        ref={editorRef}
        onWheel={handleScroll}
        onScroll={handleScroll}
        className={`overflow-auto outline-none border-t border-stone-400 ${isPerformance ? 'absolute right-0 bottom-0' : 'size-full relative'}`}
        style={
          isPerformance
            ? { left: `${performanceText.x}%`, top: `${performanceText.y}%` }
            : undefined
        }
      />
    </Panel>
  )
}
