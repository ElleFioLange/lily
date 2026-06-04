import { useRef, useEffect, useCallback } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, highlightActiveLine, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { search, searchKeymap } from '@codemirror/search'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin } from '@plugins/utils'
import { StrudelState } from '../store'
import { WorkspaceProps } from 'src/types/plugins'
import { getSharedAudioContext } from '../audioContext'
import { getRepl, ensurePrebaked } from '../replMap'
import Panel from '@renderer/components/common/Panel'

export default function Workspace({ instanceId }: WorkspaceProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<StrudelState>
  const { code, setCode, bpm, setBpm, isPlaying, isLoading, error } = instance.useStore()

  const handleRun = useCallback(async () => {
    const store = instance.useStore.getState()
    const { code: currentCode, bpm: currentBpm, setIsPlaying, setError, setIsLoading } = store

    setIsLoading(true)
    setError(null)

    try {
      const ctx = getSharedAudioContext()
      if (ctx?.state === 'suspended') {
        await ctx.resume()
      }

      await ensurePrebaked()

      const repl = getRepl(instanceId)
      if (!repl) throw new Error('Strudel repl not found for instance')

      // bpm / 60 / 4 = cps for 4/4 time (one cycle = one bar)
      repl.setCps(currentBpm / 60 / 4)
      await repl.evaluate(currentCode)

      setIsPlaying(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setIsPlaying(false)
    } finally {
      setIsLoading(false)
    }
  }, [instance, instanceId])

  const handlePlayStop = useCallback(() => {
    const { isPlaying: playing, setIsPlaying } = instance.useStore.getState()
    const repl = getRepl(instanceId)
    if (!repl) return
    if (playing) {
      repl.stop()
      setIsPlaying(false)
    } else {
      repl.start()
      setIsPlaying(true)
    }
  }, [instance, instanceId])

  const handleBpmChange = useCallback(
    (newBpm: number) => {
      setBpm(newBpm)
      const repl = getRepl(instanceId)
      if (repl) {
        repl.setCps(newBpm / 60 / 4)
      }
    },
    [instanceId, setBpm]
  )

  useEffect(() => {
    if (!editorRef.current) return

    const theme = EditorView.theme({
      '&': { height: '100%', fontSize: '14px' },
      '.cm-content': { caretColor: '#f5f5f4', fontFamily: 'Monaspace Neon', padding: '0' },
      '.cm-gutters': {
        backgroundColor: '#2925245a',
        color: '#e7e5e4',
        border: 'none',
        paddingRight: '8px'
      },
      '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px', minWidth: '32px' },
      '.cm-activeLine': { backgroundColor: '#78716cd0 !important' },
      '& .cm-line': { width: 'fit-content', backgroundColor: '#29252480' },
      '.cm-selectionBackground': { backgroundColor: '#44403c !important' },
      '&.cm-focused .cm-selectionBackground': { backgroundColor: '#44403c !important' },
      '.cm-cursor': { borderLeftColor: '#f5f5f4' }
    })

    const highlightStyle = HighlightStyle.define([
      { tag: tags.keyword, color: '#fb7185' },
      { tag: tags.string, color: '#6ee7b7' },
      { tag: tags.number, color: '#c4b5fd' },
      { tag: tags.bool, color: '#fb7185' },
      { tag: tags.null, color: '#c4b5fd' },
      { tag: tags.operator, color: '#38bdf8' },
      { tag: tags.punctuation, color: '#fcd34d' },
      { tag: tags.function(tags.variableName), color: '#22d3ee' },
      { tag: tags.function(tags.propertyName), color: '#a3e635' },
      { tag: tags.variableName, color: '#d6d3d1' },
      { tag: tags.comment, color: '#d6d3d1', fontStyle: 'italic' }
    ])

    const strudelKeymap = keymap.of([
      {
        key: 'Shift-Enter',
        run: () => {
          handleRun()
          return true
        }
      }
    ])

    const startState = EditorState.create({
      doc: '',
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        javascript(),
        search(),
        theme,
        syntaxHighlighting(highlightStyle),
        EditorView.lineWrapping,
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
        strudelKeymap,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setCode(update.state.doc.toString())
          }
        })
      ]
    })

    const view = new EditorView({ state: startState, parent: editorRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync external code changes into editor
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== code) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: code } })
    }
  }, [code])

  return (
    <Panel className="size-full" contentClassName="size-full flex flex-col">
      {/* Transport bar */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-stone-700 text-xs font-mono shrink-0">
        <button
          onClick={handlePlayStop}
          disabled={isLoading}
          className="w-14 text-center py-0.5 border border-stone-600 hover:bg-stone-700 disabled:opacity-40"
        >
          {isPlaying ? 'stop' : 'play'}
        </button>
        <button
          onClick={handleRun}
          disabled={isLoading}
          className="w-14 text-center py-0.5 border border-stone-600 hover:bg-stone-700 disabled:opacity-40"
        >
          {isLoading ? '...' : 'run'}
        </button>
        <div className="flex items-center gap-1.5 ml-auto text-stone-400">
          <span>bpm</span>
          <input
            type="number"
            min={20}
            max={300}
            value={bpm}
            onChange={(e) => handleBpmChange(Number(e.target.value))}
            className="w-14 bg-transparent border border-stone-600 px-1 py-0.5 text-stone-200 text-center"
          />
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        onClick={() => viewRef.current?.focus()}
        className="flex-1 overflow-auto outline-none border-t border-stone-400 cursor-text"
      />

      {/* Error strip */}
      {error && (
        <div className="shrink-0 px-3 py-1.5 bg-rose-950 text-rose-300 text-xs font-mono border-t border-rose-800 break-all">
          {error}
        </div>
      )}
    </Panel>
  )
}
