import { useRef, useState, useCallback } from 'react'
import Panel from '../common/Panel'
import type { PanelId } from '../../stores/useFocusStore'
import YAMLEditor, { type YAMLEditorRef } from '../YAMLEditor'
import JavaScriptEditor from '../JavaScriptEditor'
import JSONNavigation from '../JSONNavigation'
import { useConfigurationStore } from '../../stores/useConfigurationStore'

interface ProjectConfigProps {
  panelId?: PanelId
}

type Tab = 'config' | 'hydra'

export default function ProjectConfig({ panelId }: ProjectConfigProps) {
  const [activeTab, setActiveTab] = useState<Tab>('config')
  const editorRef = useRef<YAMLEditorRef>(null)
  const [topLevelKeys, setTopLevelKeys] = useState<string[]>([])

  const {
    rawConfig,
    setRawConfig,
    loadRawConfig,
    saveRawConfig,
    resetRawConfig,
    configPath,
    isValid,
    error,
    hydraShader,
    setHydraShader,
    resetHydraShader
  } = useConfigurationStore()

  const handleLoad = useCallback(async () => {
    await loadRawConfig()
  }, [loadRawConfig])

  const handleSave = useCallback(async () => {
    await saveRawConfig()
  }, [saveRawConfig])

  const handleReset = useCallback(() => {
    if (activeTab === 'config') {
      resetRawConfig()
    } else {
      resetHydraShader()
    }
  }, [activeTab, resetRawConfig, resetHydraShader])

  const handleKeyClick = useCallback((key: string) => {
    editorRef.current?.scrollToKey(key)
  }, [])

  return (
    <Panel title="Editor" contentClassName="flex flex-col" panelId={panelId}>
      {/* Tabs */}
      <div className="flex border-b border-stone-800 bg-stone-900 shrink-0">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 text-sm transition-colors ${
            activeTab === 'config'
              ? 'bg-stone-950 text-stone-100 border-b-2 border-stone-100'
              : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800'
          }`}
        >
          Configuration
        </button>
        <button
          onClick={() => setActiveTab('hydra')}
          className={`px-4 py-2 text-sm transition-colors ${
            activeTab === 'hydra'
              ? 'bg-stone-950 text-stone-100 border-b-2 border-stone-100'
              : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800'
          }`}
        >
          Hydra Shader
        </button>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-800 bg-stone-900 shrink-0">
        {activeTab === 'config' && (
          <>
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
          </>
        )}
        <button
          onClick={handleReset}
          className="px-3 py-1 text-sm bg-stone-700 hover:bg-stone-600 text-stone-100 rounded transition-colors"
        >
          Reset
        </button>
        {activeTab === 'config' && configPath && (
          <span className="ml-auto text-xs text-stone-400 truncate max-w-xs" title={configPath}>
            {configPath}
          </span>
        )}
      </div>

      {/* Error Display */}
      {activeTab === 'config' && error && (
        <div className="px-4 py-2 bg-red-900/20 border-b border-red-800 text-red-200 text-sm shrink-0">
          Error: {error}
        </div>
      )}

      {/* Editor Container */}
      <div className="relative flex-1 overflow-hidden flex">
        {activeTab === 'config' ? (
          <>
            <YAMLEditor
              ref={editorRef}
              value={rawConfig}
              onChange={setRawConfig}
              onTopLevelKeysChange={setTopLevelKeys}
            />
            <JSONNavigation keys={topLevelKeys} onKeyClick={handleKeyClick} />
          </>
        ) : (
          <JavaScriptEditor value={hydraShader} onChange={setHydraShader} />
        )}
      </div>
    </Panel>
  )
}
