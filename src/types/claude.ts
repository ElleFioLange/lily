/**
 * Types for Claude API communication via IPC
 */

export type ClaudeMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ClaudeSendMessageParams = {
  messages: ClaudeMessage[]
  system?: string
  model?: string
  maxTokens?: number
}

export type ClaudeSendMessageResult = {
  success: boolean
  content?: string
  error?: string
}
