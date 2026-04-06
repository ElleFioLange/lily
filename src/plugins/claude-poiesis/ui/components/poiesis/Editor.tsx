import { useRef, useEffect } from 'react'
// import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
// import { defaultKeymap, history } from '@codemirror/commands'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin } from '@plugins/utils'
import { ClaudePoiesisState } from '@plugins/claude-poiesis/store'

// const conversation = [
//   { speaker: 'claude', content: 'hi this is claude testing testing', timestamp: Date.now() },
//   { speaker: 'artist', content: 'hi this isthe artist testing testing', timestamp: Date.now() },
//   { speaker: 'claude', content: 'hi this is claude testing testing', timestamp: Date.now() },
//   {
//     speaker: 'artist',
//     content:
//       'blah blah blah blah blah blah blah blahblah blah blah blahblah blah blah blahblah blah blah blahblah blah blah blahblah blah blah blahblah blah blah blahblah blah blah blahblah blah blah blahblah blah blah blahblah blah blah blahblah blah blah blah',
//     timestamp: Date.now()
//   },
//   { speaker: 'claude', content: 'hi this is claude testing testing', timestamp: Date.now() }
// ]

type PoiesisEditorProps = {
  instanceId: string
}

export default function PoiesisEditor({ instanceId }: PoiesisEditorProps) {
  const conversationRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { getInstance } = usePluginsStore()
  const instance = getInstance(instanceId) as ActivePlugin<ClaudePoiesisState>
  const { draft, conversation, setDraft, setConversation, setScrollPercentage } =
    instance.useStore()

  useEffect(() => {
    conversationRef.current?.scrollTo({ top: conversationRef.current?.scrollHeight })
  }, [conversation])

  const handleScroll = () => {
    // const editor = conversationRef.current
    // if (editor) {
    //   const { clientHeight, scrollTop } = editor
    //   const container = editor.children[0]
    //   const containerHeight = container.clientHeight
    //   const maxScroll = containerHeight - clientHeight
    //   // From 0 to 1
    //   const scrollPercentage = scrollTop / maxScroll
    //   setScrollPercentage(scrollPercentage)
    // }
  }

  const handleSend = async () => {
    const artistMessage = {
      speaker: 'artist' as const,
      content: draft,
      timestamp: new Date()
    }

    const newConversation = [...conversation, artistMessage]

    setConversation(newConversation)
    setDraft('')

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

    if (result.success && result.content) {
      const claudeMessage = {
        speaker: 'claude' as const,
        content: result.content,
        timestamp: new Date()
      }

      setConversation([...conversation, artistMessage, claudeMessage])
    } else if (result.error) {
      console.error('Claude API error:', result.error)
      // Optionally show error to user
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
          value={draft}
          onKeyDown={(e) => {
            if (e.metaKey && e.key === 'Enter') {
              e.preventDefault()
              handleSend()
            }
          }}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div />
        <div />
      </div>
      <div
        ref={conversationRef}
        onWheel={handleScroll}
        onScroll={handleScroll}
        className="w-full h-min max-h-3/5 overflow-auto outline-none relative text-2xl grid grid-cols-[minmax(64px,20%)_1fr_1fr_minmax(64px,20%)] auto-rows-min gap-4"
      >
        {conversation.map((message, idx) => {
          if (message.speaker === 'claude')
            return (
              <div
                className="grid grid-cols-subgrid col-span-4 "
                key={message.content + idx}
                // style={{ order: -idx }}
              >
                <div />
                <div />
                <div className="bg-stone-950/50 p-2">{message.content}</div>
                <div />
              </div>
            )
          else
            return (
              <div
                className="grid grid-cols-subgrid col-span-4"
                key={message.content + idx}
                // style={{ order: -idx }}
              >
                <div />
                <div className="bg-stone-950/50 p-2">{message.content}</div>
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
