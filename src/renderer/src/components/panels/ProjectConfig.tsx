import { useRef, useState, useCallback } from 'react'
import Panel from '../common/Panel'
import type { PanelId } from '../../stores/useFocusStore'
import { useFocusStore } from '../../stores/useFocusStore'
import YAMLEditor, { type YAMLEditorRef } from '../YAMLEditor'
import JavaScriptEditor from '../JavaScriptEditor'
import YAMLNavigation from '../YAMLNavigation'
import { useConfigurationStore } from '../../stores/useConfigurationStore'
import { useHydraStore } from '@renderer/stores/useHydraStore'

interface ProjectConfigProps {
  panelId?: PanelId
}

export default function ProjectConfig({ panelId }: ProjectConfigProps) {
  const activeTab = useFocusStore((state) => state.activeProjectConfigTab)
  const setActiveTab = useFocusStore((state) => state.setActiveProjectConfigTab)
  const editorRef = useRef<YAMLEditorRef>(null)
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
    isValid,
    error
  } = useConfigurationStore()

  const { rawShader, setRawShader } = useHydraStore()

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
    if (activeTab === 'config') {
      newConfig()
    } else {
      // resetHydraShader()
    }
  }, [activeTab, newConfig])

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
            disabled={!isValid}
            className="px-3 py-1 text-sm bg-stone-700 hover:bg-stone-600 text-stone-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
          <button
            onClick={handleSaveAs}
            disabled={!isValid}
            className="px-3 py-1 text-nowrap text-sm bg-stone-700 hover:bg-stone-600 text-stone-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save As
          </button>
        </div>
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
              value={config}
              onChange={setConfig}
              onTopLevelKeysChange={setTopLevelKeys}
            />
            <YAMLNavigation keys={topLevelKeys} onKeyClick={handleKeyClick} />
          </>
        ) : (
          <JavaScriptEditor value={rawShader} onChange={setRawShader} />
        )}
      </div>
    </Panel>
  )
}
