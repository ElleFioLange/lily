import { useEffect } from 'react'
import { useFocusStore, type PanelId, type ProjectConfigTab } from '../stores/useFocusStore'
import { useLayoutStore } from '../stores/useLayoutStore'
import type { LayoutType } from 'src/types/layouts'
import { useInputStore } from '@renderer/stores/useInputStore'
import { useHydraStore } from '@renderer/stores/useHydraStore'
import parseInput, { ParseAbletonResult } from '@renderer/utils/parseInput'

type ModifierKey = 'ctrl' | 'shift' | 'alt' | 'meta'

interface ShortcutConfig {
  key: string
  modifiers?: ModifierKey[]
  handler: () => void
  panelId?: PanelId
  requiredTab?: ProjectConfigTab
  bypassTextInputs?: boolean
  description?: string
}

// Helper function to normalize key names
function normalizeKey(key: string): string {
  return key.toLowerCase()
}

// Helper function to check if a shortcut matches the current event
function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutConfig): boolean {
  const eventKey = normalizeKey(event.key)
  const shortcutKey = normalizeKey(shortcut.key)

  // Check if the key matches
  if (eventKey !== shortcutKey) return false

  // Check modifiers
  const hasCtrl = event.ctrlKey || event.metaKey // Meta key (Cmd) on macOS maps to Ctrl
  const hasShift = event.shiftKey
  const hasAlt = event.altKey

  const requiredCtrl = shortcut.modifiers?.includes('ctrl') || shortcut.modifiers?.includes('meta')
  const requiredShift = shortcut.modifiers?.includes('shift')
  const requiredAlt = shortcut.modifiers?.includes('alt')

  // Check if required modifiers are pressed
  if (requiredCtrl && !hasCtrl) return false
  if (requiredShift && !hasShift) return false
  if (requiredAlt && !hasAlt) return false

  // Check if any extra modifiers are pressed (we don't want false matches)
  if (!requiredCtrl && hasCtrl) return false
  if (!requiredShift && hasShift) return false
  if (!requiredAlt && hasAlt) return false

  return true
}

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const shortcuts: ShortcutConfig[] = [
      // Global shortcuts - Layout switching
      {
        key: '1',
        modifiers: ['ctrl'],
        handler: () => {
          useLayoutStore.getState().setLayout('performance' as LayoutType)
        },
        description: 'Switch to Performance layout'
      },
      {
        key: '2',
        modifiers: ['ctrl'],
        handler: () => {
          useLayoutStore.getState().setLayout('ableton-configuration' as LayoutType)
        },
        description: 'Switch to Ableton Configuration layout'
      },
      {
        key: '3',
        modifiers: ['ctrl'],
        handler: () => {
          useLayoutStore.getState().setLayout('hydra-configuration' as LayoutType)
        },
        description: 'Switch to Hydra Configuration layout'
      },

      // Panel-specific shortcuts - Examples
      {
        panelId: 'live-preview',
        key: 'Enter',
        modifiers: ['ctrl', 'shift'],
        handler: () => {
          const { input } = useInputStore.getState()
          const messages = parseInput(input, 'ableton') as any as ParseAbletonResult
          console.log('messages', messages)
          window.api.hydra.triggerAnimation()
          messages.forEach(({ address, args }) => {
            window.api.osc.send(address, args)
          })
        },
        bypassTextInputs: true,
        description: 'Evaluate input and send control messages'
      },
      {
        panelId: 'ableton-monitor',
        key: 'Tab',
        handler: () => {
          console.log('AbletonMonitor: Tab pressed')
          // TODO: Implement toggle action
        },
        description: 'AbletonMonitor toggle action'
      },

      // Tab-specific shortcut - Hydra shader evaluation
      {
        panelId: 'project-config',
        requiredTab: 'hydra',
        key: 'Enter',
        modifiers: ['ctrl', 'shift'],
        handler: () => {
          useHydraStore.getState().evaluateShader()
        },
        bypassTextInputs: true,
        description: 'Evaluate Hydra shader code'
      }
    ]

    const handleKeyDown = (event: KeyboardEvent): void => {
      const focusedPanel = useFocusStore.getState().focusedPanel
      const activeTab = useFocusStore.getState().activeProjectConfigTab

      // Check if we're in a text input
      const isTextInput =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)

      for (const shortcut of shortcuts) {
        // Check if shortcut matches pressed keys
        if (!matchesShortcut(event, shortcut)) continue

        // Check if shortcut is panel-specific and panel is focused
        if (shortcut.panelId && shortcut.panelId !== focusedPanel) continue

        // Check if shortcut requires a specific tab to be active
        if (shortcut.requiredTab && shortcut.requiredTab !== activeTab) continue

        // Check if we should skip due to text input focus
        if (isTextInput && !shortcut.bypassTextInputs) continue

        // Execute shortcut
        event.preventDefault()
        shortcut.handler()
        break
      }
    }

    // Attach event listener
    window.addEventListener('keydown', handleKeyDown)

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
}
