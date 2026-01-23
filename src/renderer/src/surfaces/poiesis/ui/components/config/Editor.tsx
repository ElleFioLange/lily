import { useRef, useEffect, useCallback } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, history, indentWithTab } from '@codemirror/commands'
import { yaml } from '@codemirror/lang-yaml'
import { foldGutter, foldKeymap, syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { search, searchKeymap } from '@codemirror/search'
import { tags } from '@lezer/highlight'
import * as jsyaml from 'js-yaml'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin } from '@plugins/helpers'
import Navigation from './Navigation'
import { PoiesisState } from '@renderer/surfaces/poiesis/store'

interface ConfigEditorProps {
  instanceId: string
}

export default function ConfigEditor({ instanceId }: ConfigEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<PoiesisState>
  const {
    config,
    setConfig,
    saveConfig,
    openConfig,
    saveConfigAs,
    newConfig,
    // TODO add tooltip that shows path on hover
    configPath,
    configName,
    isValid: configIsValid,
    error: configError
  } = instance.useStore()

  const handleSave = useCallback(async () => {
    if (configPath !== null) await saveConfig()
    else await saveConfigAs()
  }, [configPath, saveConfig, saveConfigAs])

  const handleOpen = useCallback(async () => {
    await openConfig()
  }, [openConfig])

  const handleSaveAs = useCallback(async () => {
    await saveConfigAs()
  }, [saveConfigAs])

  const handleNew = useCallback(() => {
    newConfig()
  }, [newConfig])

  const handleKeyClick = useCallback((key: string) => {
    // editorRef.current?.scrollToKey(key)
  }, [])

  // Stone color theme for CodeMirror
  const configTheme = EditorView.theme({
    '&': {
      height: '100%',
      fontSize: '14px',
      backgroundColor: '#29252480' // stone-800/50
    },
    '.cm-content': {
      caretColor: '#fafaf9',
      fontFamily: 'Monaspace Neon',
      padding: '0'
    },
    '.cm-gutters': {
      backgroundColor: '#29252464', // stone-800/40
      color: '#f5f5f4', // stone-100
      border: 'none',
      paddingRight: '8px'
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 8px',
      minWidth: '32px'
    },
    '.cm-activeLine': {
      backgroundColor: '#78716c80' // stone-800/50
    },
    '.cm-foldGutter': {
      padding: '0 4px'
    },
    '.cm-foldPlaceholder': {
      backgroundColor: '#44403c', // stone-700
      border: 'none',
      color: '#a8a29e'
    },
    // '.cm-cursor': {
    //   borderLeftColor: '#f5f5f4'
    // },
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
  // useImperativeHandle(ref, () => ({
  //   scrollToKey
  // }))

  useEffect(() => {
    if (!editorRef.current) return

    // Create editor state
    const startState = EditorState.create({
      doc: config,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        foldGutter(),
        yaml(),
        search(),
        configTheme,
        syntaxHighlighting(highlightStyle),
        EditorView.lineWrapping,
        history(),
        keymap.of([...defaultKeymap, ...foldKeymap, ...searchKeymap, indentWithTab]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newValue = update.state.doc.toString()
            setConfig(newValue)

            // TODO Handle top level key change (? maybe? if new structure doesn't render this obsolete)
            // Extract and emit top-level keys
            // if (onTopLevelKeysChange) {
            //   const keys = extractTopLevelKeys(newValue)
            //   onTopLevelKeysChange(keys)
            // }
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
    // if (onTopLevelKeysChange) {
    //   const keys = extractTopLevelKeys(value)
    //   onTopLevelKeysChange(keys)
    // }

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
    if (currentValue !== config) {
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: config }
      })

      // Extract and emit top-level keys
      // if (onTopLevelKeysChange) {
      //   const keys = extractTopLevelKeys(value)
      //   onTopLevelKeysChange(keys)
      // }
    }
  }, [config, extractTopLevelKeys])

  return (
    <div className="size-full flex flex-col">
      <div className="flex items-around py-2 border-b border-stone-800 bg-stone-900 shrink-0 w-full">
        <span className="grow px-4">{configName}</span>
        <div className="flex gap-2 overflow-x-auto shrink no-scrollbar pr-4">
          <button onClick={handleNew}>New</button>
          <button onClick={handleOpen}>Open</button>
          <button onClick={handleSave} disabled={!configIsValid}>
            Save
          </button>
          <button onClick={handleSaveAs} disabled={!configIsValid}>
            Save As
          </button>
        </div>
      </div>
      {/* Error Display */}
      {configError && (
        <div className="px-4 py-2 bg-red-900/20 border-b border-red-800 text-red-200 text-sm shrink-0">
          Error: {configError}
        </div>
      )}
      {/* Editor Container */}{' '}
      <div className="relative flex-1 overflow-hidden flex">
        <div ref={editorRef} className="h-full w-full overflow-hidden" />
        <Navigation keys={[]} onKeyClick={handleKeyClick} />
      </div>
    </div>
  )
}
