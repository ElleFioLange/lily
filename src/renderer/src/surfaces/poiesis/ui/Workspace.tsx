import { useRef, useEffect } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { defaultKeymap, history } from '@codemirror/commands'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin } from '@plugins/helpers'
import { PoiesisState } from '../store'

type PoiesisWorkspaceProps = {
  instanceId: string
}

export default function PoiesisWorkspace({ instanceId }: PoiesisWorkspaceProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<PoiesisState>
  const { poiesis, setPoiesis, setScrollPercentage } = instance.useStore()

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div
      className="size-full flex items-center relative cursor-text"
      onClick={() => viewRef.current?.focus()}
    >
      <div
        ref={editorRef}
        onWheel={handleScroll}
        onScroll={handleScroll}
        className="w-full max-h-full overflow-auto outline-none relative"
      />
    </div>
  )
}
