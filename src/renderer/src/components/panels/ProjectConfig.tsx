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

// TODO make the file system more forgiving for saving with errors

// TODO fix undo redo functionality

// TODO hydra file system

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
    isValid: configIsValid,
    error: configError
  } = useConfigurationStore()

  const {
    rawShader,
    setRawShader,
    shaderPath,
    shaderName,
    isValid: shaderIsValid,
    error: shaderError,
    saveShader,
    openShader,
    saveShaderAs,
    newShader
  } = useHydraStore()

  const handleSave = useCallback(async () => {
    if (activeTab === 'config') {
      if (configPath !== null) await saveConfig()
      else await saveConfigAs()
    } else {
      if (shaderPath !== null) await saveShader()
      else await saveShaderAs()
    }
  }, [activeTab, configPath, shaderPath, saveConfig, saveConfigAs, saveShader, saveShaderAs])

  const handleOpen = useCallback(async () => {
    if (activeTab === 'config') {
      await openConfig()
    } else {
      await openShader()
    }
  }, [activeTab, openConfig, openShader])

  const handleSaveAs = useCallback(async () => {
    if (activeTab === 'config') {
      await saveConfigAs()
    } else {
      await saveShaderAs()
    }
  }, [activeTab, saveConfigAs, saveShaderAs])

  const handleNew = useCallback(() => {
    if (activeTab === 'config') {
      newConfig()
    } else {
      newShader()
    }
  }, [activeTab, newConfig, newShader])

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
        <span className="grow px-4">{activeTab === 'config' ? configName : shaderName}</span>
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
            disabled={activeTab === 'config' ? !configIsValid : !shaderIsValid}
            className="px-3 py-1 text-sm bg-stone-700 hover:bg-stone-600 text-stone-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
          <button
            onClick={handleSaveAs}
            disabled={activeTab === 'config' ? !configIsValid : !shaderIsValid}
            className="px-3 py-1 text-nowrap text-sm bg-stone-700 hover:bg-stone-600 text-stone-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save As
          </button>
        </div>
      </div>

      {/* Error Display */}
      {activeTab === 'config' && configError && (
        <div className="px-4 py-2 bg-red-900/20 border-b border-red-800 text-red-200 text-sm shrink-0">
          Error: {configError}
        </div>
      )}
      {activeTab === 'hydra' && shaderError && (
        <div className="px-4 py-2 bg-red-900/20 border-b border-red-800 text-red-200 text-sm shrink-0">
          Error: {shaderError}
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
