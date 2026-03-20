import { useRef, useEffect } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { defaultKeymap, history } from '@codemirror/commands'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin } from '@plugins/utils'
import { PoiesisState } from '../../../store'
import { AudioManager } from '@renderer/audio/AudioManager'
import { KeywordShaderManager } from '@renderer/surfaces/poiesis/lib/KeywordShaderManager'
import TextOverlay from './TextOverlay'

type PoiesisEditorProps = {
  instanceId: string
  environment: 'main' | 'performance'
}

export default function PoiesisEditor({ instanceId, environment }: PoiesisEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<PoiesisState>
  const { poiesis, setPoiesis, setScrollPercentage, setAudioManager, setShaderManager } =
    instance.useStore()

  useEffect(() => {
    if (!editorRef.current) return

    // Custom theme for centered, minimal text editor
    const poiesisTheme = EditorView.theme({
      '&': {
        backgroundColor: 'transparent',
        height: '100%'
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
        fontSize: '24px !important',
        padding: '2rem',
        whiteSpace: 'pre-wrap',
        display: 'flex !important',
        flexDirection: 'column',
        alignItems: 'center'
      },
      '.cm-line': {
        // textAlign: 'center',
        width: 'fit-content',
        backgroundColor: '#29252440' // stone-800/25
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
        poiesisTheme,
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
    const editor = editorRef.current
    if (editor) {
      const { clientHeight, scrollTop } = editor

      const container = editor.children[0]
      const containerHeight = container.clientHeight

      const maxScroll = containerHeight - clientHeight

      // From 0 to 1
      const scrollPercentage = scrollTop / maxScroll

      setScrollPercentage(scrollPercentage)
    }
  }

  // Initialize audio keyword shader system
  useEffect(() => {
    if (environment === 'performance') {
      let audioManager: AudioManager | null = null
      let shaderManager: KeywordShaderManager | null = null

      async function initializeSystems() {
        // Initialize audio system
        try {
          // Load settings to get selected audio device
          const settings = await window.api.settings.get()
          const deviceId = settings.audio.autoDetect
            ? undefined
            : settings.audio.deviceId || undefined

          audioManager = new AudioManager()
          await audioManager.initialize(deviceId)
          setAudioManager(audioManager)
          console.log('Audio system initialized')
        } catch (err) {
          console.error('Failed to initialize audio:', err)
          console.warn('Continuing without audio - shaders will receive zero values')
        }

        // Initialize shader manager (depends on audio)
        if (audioManager) {
          shaderManager = new KeywordShaderManager(audioManager)
          shaderManager.startRenderLoop()
          setShaderManager(shaderManager)
          console.log('Shader manager initialized')
        } else {
          console.warn('Shader manager not initialized due to audio failure')
        }
      }

      initializeSystems()

      // Cleanup on unmount
      return () => {
        setAudioManager(null)
        setShaderManager(null)
      }
    } else return () => {}
  }, [environment, setAudioManager, setShaderManager])

  if (environment === 'main')
    return (
      <div
        className="size-full flex items-center relative cursor-text"
        onClick={() => viewRef.current?.focus()}
      >
        <div
          ref={editorRef}
          onWheel={handleScroll}
          onScroll={handleScroll}
          className="w-full h-min max-h-full overflow-auto outline-none relative text-2xl"
        />
      </div>
    )
  else return <TextOverlay instanceId={instanceId} />
}
