import { useRef, useEffect } from 'react'
import { EditorView } from '@codemirror/view'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin } from '@plugins/utils'
import { LLMPoiesisState } from '@plugins/llm-poiesis/store'
import { ClaudeMessage } from 'src/types/claude'

type PoiesisEditorProps = {
  instanceId: string
}

const CHAR_DELAY_MS = 120
const WORD_PAUSE_MS = 300

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

type SendResult = { success: true; content: string } | { success: false; error: string }

async function sendToLocal(
  baseUrl: string,
  messages: { role: string; content: string }[],
  systemPrompt: string,
  maxTokens: number
): Promise<SendResult> {
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'local-model',
        max_tokens: maxTokens,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          ...messages
        ]
      })
    })

    if (!res.ok) return { success: false, error: `LM Studio error: ${res.status} ${res.statusText}` }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return { success: false, error: 'No content in response' }
    return { success: true, content }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to reach local model' }
  }
}

export default function PoiesisEditor({ instanceId }: PoiesisEditorProps) {
  const conversationRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const animationCancelRef = useRef(false)

  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<LLMPoiesisState>
  const {
    draft,
    conversation,
    setDraft,
    setConversation,
    setMaskWord,
    setMaskFont,
    isWaitingForResponse,
    setIsWaitingForResponse,
    artistFont,
    responseFont,
    systemPrompt,
    llmProvider,
    localModelUrl
  } = instance.useStore()

  useEffect(() => {
    conversationRef.current?.scrollTo({ top: conversationRef.current?.scrollHeight })
  }, [conversation])

  const animateResponseWords = async (words: string[]) => {
    animationCancelRef.current = false

    for (const word of words) {
      for (let i = 1; i <= word.length; i++) {
        if (animationCancelRef.current) return
        setMaskWord(word.slice(0, i))
        await sleep(CHAR_DELAY_MS)
      }
      await sleep(WORD_PAUSE_MS)
    }

    setMaskWord('')
  }

  const handleSend = async () => {
    animationCancelRef.current = true

    const artistMessage = {
      speaker: 'artist' as const,
      content: draft,
      timestamp: new Date()
    }

    const newConversation = [...conversation, artistMessage]

    setConversation(newConversation)
    setDraft('')
    setMaskWord('')
    setIsWaitingForResponse(true)

    const apiMessages: ClaudeMessage[] = newConversation.map(({ content, speaker }) => ({
      content,
      role: speaker === 'artist' ? 'user' : ('assistant' as const)
    }))

    let result: SendResult
    if (llmProvider === 'claude') {
      const r = await window.api.claude.sendMessage({
        messages: apiMessages,
        system: systemPrompt,
        model: 'claude-sonnet-4-6',
        maxTokens: 128
      })
      result = r.success && r.content
        ? { success: true, content: r.content }
        : { success: false, error: r.error ?? 'Unknown error' }
    } else {
      result = await sendToLocal(localModelUrl, apiMessages, systemPrompt, 128)
    }

    setIsWaitingForResponse(false)

    if (result.success) {
      const responseMessage = {
        speaker: 'response' as const,
        content: result.content,
        timestamp: new Date()
      }

      setConversation([...newConversation, responseMessage])

      setMaskFont(responseFont)
      const words = result.content.split(' ').filter((w) => w.length > 0)
      animateResponseWords(words)
    } else {
      console.error('LLM error:', result.error)
    }
  }

  const handleDraftChange = (value: string) => {
    setDraft(value)
    if (!isWaitingForResponse) {
      setMaskFont(artistFont)
      const words = value.split(' ')
      setMaskWord(words[words.length - 1])
    }
  }

  return (
    <div
      className="size-full flex flex-col-reverse gap-4 relative cursor-text"
      onClick={() => viewRef.current?.focus()}
    >
      <div className="w-full h-2/5 overflow-auto outline-none relative text-2xl grid grid-cols-[minmax(64px,20%)_1fr_1fr_minmax(64px,20%)] gap-4">
        <div />
        <textarea
          className="min-h-8 max-h-32 p-2 border border-stone-100 outline-none resize-none"
          style={{ fontFamily: artistFont }}
          value={draft}
          disabled={isWaitingForResponse}
          onKeyDown={(e) => {
            if (e.metaKey && e.key === 'Enter') {
              e.preventDefault()
              handleSend()
            }
          }}
          onChange={(e) => handleDraftChange(e.target.value)}
        />
        <div />
        <div />
      </div>
      <div
        ref={conversationRef}
        className="w-full h-min max-h-3/5 overflow-auto outline-none relative text-2xl grid grid-cols-[minmax(64px,20%)_1fr_1fr_minmax(64px,20%)] auto-rows-min gap-4"
      >
        {conversation.map((message, idx) => {
          if (message.speaker === 'response')
            return (
              <div className="grid grid-cols-subgrid col-span-4" key={message.content + idx}>
                <div />
                <div />
                <div className="bg-stone-950/50 p-2" style={{ fontFamily: responseFont }}>
                  {message.content}
                </div>
                <div />
              </div>
            )
          else
            return (
              <div className="grid grid-cols-subgrid col-span-4" key={message.content + idx}>
                <div />
                <div className="bg-stone-950/50 p-2" style={{ fontFamily: artistFont }}>
                  {message.content}
                </div>
                <div />
                <div />
              </div>
            )
        })}
      </div>
      <div className="shrink h-auto w-full" />
    </div>
  )
}
