import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin, UIProps } from 'src/types/plugins'
import { LLMPoiesisState, LLMProvider } from '../store'
import FileSystem from '@renderer/components/FileSystem'

const testFiles = {
  test: { name: 'test', path: 'test', content: 'test', extension: 'js' as 'js' | 'txt' },
  test1: { name: 'test1', path: 'test1', content: 'test1', extension: 'txt' as 'js' | 'txt' },
  test2: { name: 'test2', path: 'test2', content: 'test2', extension: 'txt' as 'js' | 'txt' },
  test3: { name: 'test3', path: 'test3', content: 'test3', extension: 'txt' as 'js' | 'txt' }
}

const FONTS = [
  { label: 'Sans-serif', value: 'sans-serif' },
  { label: 'Serif', value: 'serif' },
  { label: 'Monospace', value: 'monospace' },
  { label: 'Helvetica Neue', value: '"Helvetica Neue", Helvetica, sans-serif' },
  { label: 'Futura', value: 'Futura, "Century Gothic", sans-serif' },
  { label: 'Gill Sans', value: '"Gill Sans", "Gill Sans MT", sans-serif' },
  { label: 'Optima', value: 'Optima, "Segoe UI", sans-serif' },
  { label: 'Baskerville', value: 'Baskerville, "Book Antiqua", serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Palatino', value: '"Palatino Linotype", Palatino, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Impact', value: 'Impact, "Arial Narrow", sans-serif' }
]

function FontSelect({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (font: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-stone-400 uppercase tracking-wider">{label}</label>
      <select
        className="bg-stone-900 border border-stone-700 text-stone-100 px-2 py-1 outline-none hover:border-stone-500 focus:border-stone-400"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ fontFamily: value }}
      >
        {FONTS.map((f) => (
          <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
            {f.label}
          </option>
        ))}
      </select>
      <span className="text-sm text-stone-300 truncate" style={{ fontFamily: value }}>
        The quick brown fox
      </span>
    </div>
  )
}

export default function Options({ instanceId }: UIProps) {
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<LLMPoiesisState>
  const {
    openSurface,
    setOpenSurface,
    artistFont,
    responseFont,
    setArtistFont,
    setResponseFont,
    llmProvider,
    setLLMProvider,
    localModelUrl,
    setLocalModelUrl,
    systemPrompt,
    setSystemPrompt
  } = instance.useStore()

  const handleOpen = async () => {
    const { success, content, path, error } = await window.api.files.open()
    if (success && content && path) {
      const type = path?.split('.').at(-1)
      if (type === 'yaml' || type === 'yml') {
        const { openConfig } = instance.useStore.getState()
        openConfig(content, path)
      }
    } else {
      console.error(error)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <button onClick={() => setOpenSurface(openSurface === 'poiesis' ? 'config' : 'poiesis')}>
        {openSurface}
      </button>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-400 uppercase tracking-wider">LLM provider</label>
        <div className="flex gap-2">
          {(['claude', 'local'] as LLMProvider[]).map((p) => (
            <button
              key={p}
              className={`flex-1 px-3 py-1 text-sm border ${
                llmProvider === p
                  ? 'border-stone-300 text-stone-100 bg-stone-700'
                  : 'border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200'
              }`}
              onClick={() => setLLMProvider(p)}
            >
              {p === 'claude' ? 'Claude API' : 'Local (LM Studio)'}
            </button>
          ))}
        </div>
        {llmProvider === 'local' && (
          <div className="flex flex-col gap-1 mt-1">
            <label className="text-xs text-stone-500">Server URL</label>
            <input
              className="bg-stone-900 border border-stone-700 text-stone-100 px-2 py-1 outline-none text-sm hover:border-stone-500 focus:border-stone-400 font-mono"
              value={localModelUrl}
              onChange={(e) => setLocalModelUrl(e.target.value)}
              placeholder="http://localhost:1234/v1"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <FontSelect label="Artist font" value={artistFont} onChange={setArtistFont} />
        <FontSelect label="Response font" value={responseFont} onChange={setResponseFont} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-stone-400 uppercase tracking-wider">System prompt</label>
        <textarea
          className="bg-stone-900 border border-stone-700 text-stone-100 px-2 py-1 outline-none resize-none hover:border-stone-500 focus:border-stone-400 text-sm leading-relaxed"
          rows={8}
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
        />
      </div>

      <FileSystem className="border-none p-0" handleOpen={handleOpen} files={testFiles} />
    </div>
  )
}
