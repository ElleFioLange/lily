import { app, dialog } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

const MAX_DEVICE_FILENAME = 'lily-controller.amxd'

/**
 * Get the path to the bundled Max device
 */
function getBundledDevicePath(): string {
  // In development, use resources folder directly
  // In production, use app.getAppPath() which points to the unpacked asar
  const basePath = app.isPackaged ? process.resourcesPath : app.getAppPath()
  return path.join(basePath, 'resources', 'max-devices', MAX_DEVICE_FILENAME)
}

/**
 * Get the default Ableton User Library path for Max MIDI Effects
 */
function getDefaultAbletonPath(): string {
  const homeDir = os.homedir()
  const documentsPath = path.join(homeDir, 'Documents')

  // Default Ableton User Library location
  return path.join(
    documentsPath,
    'Ableton',
    'User Library',
    'Presets',
    'MIDI Effects',
    'Max MIDI Effect'
  )
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Ensure a directory exists, creating it if necessary
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true })
  } catch (err) {
    console.error('Error creating directory:', err)
    throw err
  }
}

export interface ExportResult {
  success: boolean
  filePath?: string
  error?: string
}

/**
 * Export the Max device with a save dialog
 * Allows user to choose where to save the device
 */
export async function exportMaxDevice(): Promise<ExportResult> {
  try {
    const sourcePath = getBundledDevicePath()

    // Check if bundled device exists
    if (!(await fileExists(sourcePath))) {
      return {
        success: false,
        error: `Max device not found at: ${sourcePath}`
      }
    }

    // Show save dialog
    const defaultPath = path.join(getDefaultAbletonPath(), MAX_DEVICE_FILENAME)

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Export Lily Max for Live Device',
      defaultPath,
      filters: [{ name: 'Max for Live Device', extensions: ['amxd'] }],
      properties: ['createDirectory', 'showOverwriteConfirmation']
    })

    if (canceled || !filePath) {
      return {
        success: false,
        error: 'Export canceled by user'
      }
    }

    // Ensure destination directory exists
    const destDir = path.dirname(filePath)
    await ensureDir(destDir)

    // Copy the file
    await fs.copyFile(sourcePath, filePath)

    console.log(`Max device exported to: ${filePath}`)

    return {
      success: true,
      filePath
    }
  } catch (err) {
    console.error('Error exporting Max device:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }
  }
}

/**
 * Quick install the Max device directly to Ableton User Library
 * No dialog, just copies to the default location
 */
export async function quickInstallMaxDevice(): Promise<ExportResult> {
  try {
    const sourcePath = getBundledDevicePath()

    // Check if bundled device exists
    if (!(await fileExists(sourcePath))) {
      return {
        success: false,
        error: `Max device not found at: ${sourcePath}`
      }
    }

    // Get destination path
    const destDir = getDefaultAbletonPath()
    const destPath = path.join(destDir, MAX_DEVICE_FILENAME)

    // Ensure destination directory exists
    await ensureDir(destDir)

    // Copy the file
    await fs.copyFile(sourcePath, destPath)

    console.log(`Max device quick-installed to: ${destPath}`)

    return {
      success: true,
      filePath: destPath
    }
  } catch (err) {
    console.error('Error quick-installing Max device:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }
  }
}

/**
 * Check if the bundled Max device exists
 */
export async function checkMaxDeviceExists(): Promise<boolean> {
  const sourcePath = getBundledDevicePath()
  return await fileExists(sourcePath)
}

/**
 * Get information about the Max device
 */
export async function getMaxDeviceInfo(): Promise<{
  exists: boolean
  path: string
  size?: number
}> {
  const sourcePath = getBundledDevicePath()
  const exists = await fileExists(sourcePath)

  let size: number | undefined

  if (exists) {
    try {
      const stats = await fs.stat(sourcePath)
      size = stats.size
    } catch {
      // Ignore errors
    }
  }

  return {
    exists,
    path: sourcePath,
    size
  }
}
