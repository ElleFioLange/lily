/**
 * Register the audio buffer processor AudioWorklet
 * Must be called before creating AudioWorkletNode
 */
export async function registerAudioBufferProcessor(context: AudioContext): Promise<void> {
  try {
    // In development, Vite serves files from the dev server
    // In production, files are bundled into the app
    const workletPath = import.meta.env.DEV
      ? new URL('./audio-buffer-processor.ts', import.meta.url).href
      : './worklet/audio-buffer-processor.js'

    await context.audioWorklet.addModule(workletPath)
    console.log('Audio buffer processor worklet registered')
  } catch (error) {
    console.error('Failed to register audio buffer processor:', error)
    throw error
  }
}
