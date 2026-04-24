import { useRef, useEffect } from 'react'
import { EditorView } from '@codemirror/view'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin } from '@plugins/utils'
import { ClaudePoiesisState } from '@plugins/claude-poiesis/store'

type PoiesisEditorProps = {
  instanceId: string
}

const CHAR_DELAY_MS = 120
const WORD_PAUSE_MS = 300

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export default function PoiesisEditor({ instanceId }: PoiesisEditorProps) {
  const conversationRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const animationCancelRef = useRef(false)

  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<ClaudePoiesisState>
  const {
    draft,
    conversation,
    setDraft,
    setConversation,
    setMaskWord,
    setMaskFont,
    isWaitingForClaude,
    setIsWaitingForClaude,
    artistFont,
    claudeFont
  } = instance.useStore()

  useEffect(() => {
    conversationRef.current?.scrollTo({ top: conversationRef.current?.scrollHeight })
  }, [conversation])

  const animateClaudeWords = async (words: string[]) => {
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
    // Cancel any in-flight Claude word animation
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
    setIsWaitingForClaude(true)

    const result = await window.api.claude.sendMessage({
      messages: newConversation.map(({ content, speaker }) => ({
        content,
        role: speaker === 'artist' ? 'user' : 'assistant'
      })),
      system:
        'You are playing a character named Madeleine. You are a companion to a musical performance. You are embodied on stage as a female mannequinn wearing a long black wool skirt, a cream sleeveless vest, and a womens business jacket. I, the performer, am having a conversation with you as part of the performance. Respond in in short, sharply written sentences. NO MORE THAN 2 SENTENCES. KEEP IT SHORT. Your main goal is to ask questions to prompt insight from me as a performer. Topics will be range from art to artificial intelligence to politics to culture to gender and much more.',
      model: 'claude-sonnet-4-6',
      maxTokens: 128
    })

    setIsWaitingForClaude(false)

    if (result.success && result.content) {
      const claudeMessage = {
        speaker: 'claude' as const,
        content: result.content,
        timestamp: new Date()
      }

      setConversation([...newConversation, claudeMessage])

      // Animate Claude's response word by word using Claude's font
      setMaskFont(claudeFont)
      const words = result.content.split(' ').filter((w) => w.length > 0)
      animateClaudeWords(words)
    } else if (result.error) {
      console.error('Claude API error:', result.error)
    }
  }

  const handleDraftChange = (value: string) => {
    setDraft(value)
    if (!isWaitingForClaude) {
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
          disabled={isWaitingForClaude}
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
          if (message.speaker === 'claude')
            return (
              <div className="grid grid-cols-subgrid col-span-4 " key={message.content + idx}>
                <div />
                <div />
                <div className="bg-stone-950/50 p-2" style={{ fontFamily: claudeFont }}>{message.content}</div>
                <div />
              </div>
            )
          else
            return (
              <div className="grid grid-cols-subgrid col-span-4" key={message.content + idx}>
                <div />
                <div className="bg-stone-950/50 p-2" style={{ fontFamily: artistFont }}>{message.content}</div>
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
