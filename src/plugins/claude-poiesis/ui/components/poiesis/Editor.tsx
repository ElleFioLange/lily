import { useRef, useEffect } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { defaultKeymap, history } from '@codemirror/commands'
import { usePluginsStore } from '@renderer/stores/usePluginsStore'
import { ActivePlugin } from '@plugins/utils'
import { ClaudePoiesisState } from '@plugins/claude-poiesis/store'
import Anthropic from '@anthropic-ai/sdk'

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

const client = new Anthropic({
  apiKey: '',
  dangerouslyAllowBrowser: true
})

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
    // const editor = conversationRef.current!
    // const { clientHeight, scrollTop } = editor
    // const container = editor.children[0]
    // const containerHeight = container.clientHeight
    // const maxScroll = containerHeight - clientHeight
    // // From 0 to 1
    // const scrollPercentage = scrollTop / maxScroll
    // setScrollPercentage(scrollPercentage)
  }

  const handleSend = () => {
    const artistMessage = {
      speaker: 'artist' as const,
      content: draft,
      timestamp: new Date()
    }

    const newConversation = [...conversation, artistMessage]

    setConversation(newConversation)
    setDraft('')

    client.messages
      .create({
        max_tokens: 128,
        messages: newConversation.map(({ content, speaker }) => ({
          content,
          role: speaker === 'artist' ? 'user' : 'assistant'
        })),
        system: 'Continue this poem with a short stanza.',
        model: 'claude-sonnet-4-6'
      })
      .then((response) => {
        if (response.content[0].type === 'text') {
          const claudeMessage = {
            speaker: 'claude' as const,
            content: response.content[0].text,
            timestamp: new Date()
          }

          setConversation([...conversation, artistMessage, claudeMessage])
        }
      })
  }

  return (
    <div
      className="size-full flex flex-col-reverse gap-4 relative cursor-text"
      onClick={() => viewRef.current?.focus()}
    >
      <div className="w-full h-2/5 overflow-auto outline-none relative text-2xl grid grid-cols-[minmax(64px,20%)_1fr_1fr_minmax(64px,20%)] gap-4">
        <div />
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
                <div className="bg-stone-950/50 p-2">{message.content}</div>
                <div />
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
                <div />
                <div className="bg-stone-950/50 p-2">{message.content}</div>
                <div />
              </div>
            )
        })}
      </div>
      <div className="shrink h-auto w-full" />
    </div>
  )
}
