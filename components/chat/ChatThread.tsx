'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Message, DashboardConfig } from '@/lib/types'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'

const ONBOARDING_GREETING = `Hey! I'm here to help you build your personal dashboard.

Tell me about your goals — what are you working on, what habits do you want to build, anything you want to track or cut back on?

Don't worry about format, just talk to me like you would a friend.`

interface ChatThreadProps {
  initialMessages: Message[]
  userId: string
  isOnboarding: boolean
  isFullPage: boolean
  onNewDashboardVersion?: (config: DashboardConfig, messageId: string) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  autoSendMessage?: string | null
  onAutoSendConsumed?: () => void
}

export default function ChatThread({
  initialMessages,
  userId,
  isOnboarding,
  isFullPage,
  onNewDashboardVersion,
  collapsed = false,
  onToggleCollapse,
  autoSendMessage,
  onAutoSendConsumed,
}: ChatThreadProps) {
  const router = useRouter()
  const supabase = createClient()
  const scrollRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  const showGreeting = isOnboarding && messages.length === 0

  useEffect(() => {
    if (autoSendMessage) {
      sendMessage(autoSendMessage)
      onAutoSendConsumed?.()
    }
  }, [autoSendMessage]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingText])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return

      const optimisticUser: Message = {
        id: `temp-${Date.now()}`,
        user_id: userId,
        role: 'user',
        content,
        dashboard_snapshot: null,
        is_dashboard_version: false,
        version_name: null,
        created_at: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, optimisticUser])
      setIsStreaming(true)
      setStreamingText('')

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content }),
        })

        if (!res.ok || !res.body) throw new Error('Stream failed')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let fullText = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          fullText += decoder.decode(value, { stream: true })
          setStreamingText(fullText)
        }

        // Fetch the two most recent saved messages
        const { data: savedMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(2)

        if (savedMessages) {
          const assistantMsg = savedMessages.find((m) => m.role === 'assistant')
          const userMsg = savedMessages.find((m) => m.role === 'user')

          setMessages((prev) => {
            const withoutOptimistic = prev.filter((m) => m.id !== optimisticUser.id)
            const toAdd: Message[] = []
            if (userMsg) toAdd.push(userMsg)
            if (assistantMsg) toAdd.push(assistantMsg)
            return [...withoutOptimistic, ...toAdd]
          })

          if (assistantMsg?.is_dashboard_version && assistantMsg.dashboard_snapshot) {
            if (!isOnboarding && onNewDashboardVersion) {
              onNewDashboardVersion(assistantMsg.dashboard_snapshot, assistantMsg.id)
            }
          }
        }
      } catch (err) {
        console.error(err)
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id))
      } finally {
        setIsStreaming(false)
        setStreamingText('')
      }
    },
    [isStreaming, userId, supabase, isOnboarding, onNewDashboardVersion]
  )

  async function promoteToMain(config: DashboardConfig, messageId: string) {
    const { data: existing } = await supabase
      .from('dashboards')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existing) {
      await supabase
        .from('dashboards')
        .update({
          config,
          promoted_from_message_id: messageId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await supabase.from('dashboards').insert({
        user_id: userId,
        config,
        promoted_from_message_id: messageId,
      })
    }

    if (isOnboarding) {
      await supabase.from('profiles').update({ onboarded: true }).eq('id', userId)
      router.push('/dashboard')
    } else {
      router.refresh()
    }
  }

  const displayMessages = showGreeting
    ? [
        {
          id: 'greeting',
          role: 'assistant' as const,
          content: ONBOARDING_GREETING,
          dashboard_snapshot: null,
          is_dashboard_version: false,
          version_name: null,
          created_at: new Date().toISOString(),
          user_id: '',
        },
        ...messages,
      ]
    : messages

  return (
    <div className="flex flex-col h-full" style={{ background: 'transparent' }}>
      {/* Header */}
      {isFullPage ? (
        !isOnboarding && (
          <div
            className="shrink-0 flex items-center justify-between px-4 py-2.5"
          >
            <span className="text-xs font-medium opacity-30" style={{ color: 'var(--text)' }}>
              Chat thread
            </span>
            <button
              onClick={() => router.push('/dashboard?chat=open')}
              className="text-xs opacity-30 hover:opacity-60 transition-opacity"
              title="Back to dashboard"
            >
              ↓
            </button>
          </div>
        )
      ) : (
        <div
          className="flex items-center justify-between px-4 py-2.5 shrink-0"
        >
          <span className="text-xs font-medium opacity-30" style={{ color: 'var(--text)' }}>
            {isStreaming ? (
              <span className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: 'var(--text)' }}
                />
                thinking...
              </span>
            ) : (
              'Chat thread'
            )}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/chat')}
              className="opacity-30 hover:opacity-60 transition-opacity"
              title="Open full page"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M1 4V1h3M10 1h3v3M13 10v3h-3M4 13H1v-3" />
              </svg>
            </button>
            <button
              onClick={onToggleCollapse}
              className="text-xs opacity-30 hover:opacity-60 transition-opacity"
            >
              ↓
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {displayMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onPromote={promoteToMain} />
        ))}

        {isStreaming && streamingText && (
          <MessageBubble
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingText,
              dashboard_snapshot: null,
              is_dashboard_version: false,
              version_name: null,
              created_at: new Date().toISOString(),
              user_id: '',
            }}
            streaming
          />
        )}

        {isStreaming && !streamingText && (
          <div className="flex gap-1 px-1 items-end h-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{
                  background: 'var(--text)',
                  opacity: 0.3,
                  animationDelay: `${i * 0.12}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-3 pb-3 pt-0">
        <ChatInput
          onSend={sendMessage}
          disabled={isStreaming}
          placeholder={isOnboarding ? 'Tell me about your goals...' : 'Make changes...'}
        />
      </div>
    </div>
  )
}
