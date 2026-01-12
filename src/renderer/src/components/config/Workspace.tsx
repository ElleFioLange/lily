import { useRef, useState, useCallback } from 'react'
import Panel from '../common/Panel'
import ConfigEditor, { ConfigEditorRef } from './Editor'
import Navigation from './Navigation'
import { useConfigurationStore } from '../../stores/useConfigurationStore'

// TODO make the file system more forgiving for saving with errors

// TODO fix undo redo functionality

// TODO hydra file system

export default function ConfigWorkspace() {
  const editorRef = useRef<ConfigEditorRef>(null)
  const [topLevelKeys, setTopLevelKeys] = useState<string[]>([])

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
  } = useConfigurationStore()

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
    editorRef.current?.scrollToKey(key)
  }, [])

  return (
    <Panel title="Editor" contentClassName="flex flex-col">
      {/* Controls Bar */}
      <div className="flex items-around py-2 border-b border-stone-800 bg-stone-900 shrink-0 w-full">
        <span className="grow px-4">{configName}</span>
        <div className="flex gap-2 overflow-x-auto shrink no-scrollbar pr-4">
          <button
            onClick={handleNew}
            className="px-3 py-1 text-sm bg-stone-700 hover:bg-stone-600 text-stone-100 rounded transition-colors"
          >
            New
          </button>
          <button
            onClick={handleOpen}
            className="px-3 py-1 text-sm bg-stone-700 hover:bg-stone-600 text-stone-100 rounded transition-colors"
          >
            Open
          </button>
          <button
            onClick={handleSave}
            disabled={!configIsValid}
            className="px-3 py-1 text-sm bg-stone-700 hover:bg-stone-600 text-stone-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
          <button
            onClick={handleSaveAs}
            disabled={!configIsValid}
            className="px-3 py-1 text-nowrap text-sm bg-stone-700 hover:bg-stone-600 text-stone-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
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

      {/* Editor Container */}
      <div className="relative flex-1 overflow-hidden flex">
        <ConfigEditor
          ref={editorRef}
          value={config}
          onChange={setConfig}
          onTopLevelKeysChange={setTopLevelKeys}
        />
        <Navigation keys={topLevelKeys} onKeyClick={handleKeyClick} />
      </div>
    </Panel>
  )
}
