import { PluginDefinition } from 'src/types/plugins'

type PluginModule = { default: PluginDefinition }

/**
 * Dynamically loads all plugins from src/plugins/ using Vite's import.meta.glob().
 * This is a build-time feature - only plugins present when building are included.
 */
export async function loadPlugins(): Promise<PluginDefinition[]> {
  // Pattern relative to this file's location (src/renderer/src/utils/)
  // Resolves to src/plugins/*/index.ts
  const pluginModules = import.meta.glob<PluginModule>('../../../plugins/*/index.ts', {
    eager: false
  })

  const plugins: PluginDefinition[] = []

  await Promise.all(
    Object.entries(pluginModules).map(async ([path, importFn]) => {
      try {
        const module = await importFn()
        if (isValidPlugin(module.default)) {
          plugins.push(module.default)
          console.log(`[PluginLoader] Loaded: ${module.default.manifest.name}`)
        } else {
          console.warn(`[PluginLoader] Invalid plugin at ${path}: missing required properties`)
        }
      } catch (error) {
        console.error(`[PluginLoader] Failed to load ${path}:`, error)
      }
    })
  )

  return plugins
}

/**
 * Type guard to validate a PluginDefinition has required properties
 */
function isValidPlugin(obj: unknown): obj is PluginDefinition {
  if (!obj || typeof obj !== 'object') return false
  const p = obj as Record<string, unknown>
  const m = p.manifest as Record<string, unknown> | undefined
  return !!(
    m?.id &&
    m?.name &&
    typeof p.init === 'function' &&
    typeof p.process === 'function' &&
    typeof p.cleanup === 'function'
  )
}
