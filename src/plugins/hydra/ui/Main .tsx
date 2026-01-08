import { useRef, useEffect } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { defaultKeymap, history } from '@codemirror/commands'
import Panel from '@renderer/components/common/Panel'
// import type { PanelId } from '../../stores/useFocusStore'
// import { useInputStore } from '@renderer/stores/useInputStore'

interface LivePreviewProps {
  panelId?: PanelId
}

export default function Main({ panelId }: LivePreviewProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  // const input = useInputStore((state) => state.input)
  // const setInput = useInputStore((state) => state.setInput)

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
      doc: '', // input,
      extensions: [
        centeredTheme,
        EditorView.lineWrapping,
        history(),
        keymap.of(defaultKeymap),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString()
            // setInput(newValue)
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

  // Update editor content when input changes from outside
  // useEffect(() => {
  //   const view = viewRef.current
  //   if (!view) return

  //   const currentValue = view.state.doc.toString()
  //   if (currentValue !== input) {
  //     view.dispatch({
  //       changes: { from: 0, to: currentValue.length, insert: input }
  //     })
  //   }
  // }, [input])

  const handleScroll = () => {
    const editor = editorRef.current!
    const { clientHeight, scrollTop } = editor

    const container = editor.children[0]
    const containerHeight = container.clientHeight

    const maxScroll = containerHeight - clientHeight

    // From 0 to 1
    const scrollPercentage = scrollTop / maxScroll

    // Send scroll position to Hydra popup
    // window.api.hydra.sendScrollUpdate(scrollPercentage)
  }

  return (
    <Panel
      title="Live preview"
      className="size-full"
      contentClassName="size-full flex items-center justify-center bg-stone-950 relative cursor-text"
      panelId={panelId}
      onClick={() => viewRef.current?.focus()}
    >
      <div
        ref={editorRef}
        onWheel={handleScroll}
        onScroll={handleScroll}
        className="w-full max-h-full overflow-auto outline-none relative"
      />
    </Panel>
  )
}
