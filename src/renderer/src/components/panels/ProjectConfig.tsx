import { useRef, useState, useCallback } from 'react'
import Panel from '../common/Panel'
import type { PanelId } from '../../stores/useFocusStore'
import YAMLEditor, { type YAMLEditorRef } from '../YAMLEditor'
import JSONNavigation from '../JSONNavigation'
import { useConfigurationStore } from '../../stores/useConfigurationStore'

interface ProjectConfigProps {
  panelId?: PanelId
}

export default function ProjectConfig({ panelId }: ProjectConfigProps) {
  const editorRef = useRef<YAMLEditorRef>(null)
  const [topLevelKeys, setTopLevelKeys] = useState<string[]>([])

  const { config, setConfig, loadConfig, saveConfig, resetConfig, configPath, isValid, error } =
    useConfigurationStore()

  const handleLoad = useCallback(async () => {
    await loadConfig()
  }, [loadConfig])

  const handleSave = useCallback(async () => {
    await saveConfig()
  }, [saveConfig])

  const handleReset = useCallback(() => {
    resetConfig()
  }, [resetConfig])

  const handleKeyClick = useCallback((key: string) => {
    editorRef.current?.scrollToKey(key)
  }, [])

  return (
    <Panel title="Project Config" contentClassName="flex flex-col" panelId={panelId}>
      {/* Controls Bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-800 bg-stone-900 shrink-0">
        <button
          onClick={handleLoad}
          className="px-3 py-1 text-sm bg-stone-700 hover:bg-stone-600 text-stone-100 rounded transition-colors"
        >
          Load
        </button>
        <button
          onClick={handleSave}
          disabled={!isValid}
          className="px-3 py-1 text-sm bg-stone-700 hover:bg-stone-600 text-stone-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-1 text-sm bg-stone-700 hover:bg-stone-600 text-stone-100 rounded transition-colors"
        >
          Reset
        </button>
        {configPath && (
          <span className="ml-auto text-xs text-stone-400 truncate max-w-xs" title={configPath}>
            {configPath}
          </span>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-red-900/20 border-b border-red-800 text-red-200 text-sm shrink-0">
          Error: {error}
        </div>
      )}

      {/* Editor Container */}
      <div className="relative flex-1 overflow-hidden flex">
        <YAMLEditor
          ref={editorRef}
          value={config}
          onChange={setConfig}
          onTopLevelKeysChange={setTopLevelKeys}
        />
        <JSONNavigation keys={topLevelKeys} onKeyClick={handleKeyClick} />
      </div>
    </Panel>
  )
}
