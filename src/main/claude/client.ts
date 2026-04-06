/**
 * Claude API Client - Main Process
 *
 * Provides a singleton client for communicating with the Claude API
 * from the main process. This keeps API keys secure and out of the
 * renderer process.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ClaudeSendMessageParams, ClaudeSendMessageResult } from '../../types/claude'

class ClaudeClient {
  private client: Anthropic | null = null

  /**
   * Initialize the Claude client with API key from environment
   */
  init(): void {
    const apiKey = process.env.CLAUDE_API_KEY

    if (!apiKey) {
      console.warn('CLAUDE_API_KEY not found in environment variables')
      return
    }

    this.client = new Anthropic({
      apiKey
    })

    console.log('Claude API client initialized')
  }

  /**
   * Send a message to Claude and get a response
   */
  async sendMessage(params: ClaudeSendMessageParams): Promise<ClaudeSendMessageResult> {
    if (!this.client) {
      return {
        success: false,
        error: 'Claude client not initialized. Please check CLAUDE_API_KEY environment variable.'
      }
    }

    try {
      const response = await this.client.messages.create({
        model: params.model || 'claude-sonnet-4-6',
        max_tokens: params.maxTokens || 128,
        system: params.system,
        messages: params.messages
      })

      // Extract text content from response
      const textContent = response.content.find((block) => block.type === 'text')

      if (!textContent || textContent.type !== 'text') {
        return {
          success: false,
          error: 'No text content in Claude response'
        }
      }

      return {
        success: true,
        content: textContent.text
      }
    } catch (error) {
      console.error('Claude API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error calling Claude API'
      }
    }
  }

  /**
   * Check if the client is initialized
   */
  isInitialized(): boolean {
    return this.client !== null
  }
}

// Singleton instance
let clientInstance: ClaudeClient | null = null

/**
 * Get the singleton Claude client instance
 */
export function getClaudeClient(): ClaudeClient {
  if (!clientInstance) {
    clientInstance = new ClaudeClient()
  }
  return clientInstance
}
