'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Dashboard, Message, DashboardConfig } from '@/lib/types'
import ChatThread from '@/components/chat/ChatThread'
import ChatInput from '@/components/chat/ChatInput'
import DashboardRenderer from './DashboardRenderer'

interface DashboardShellProps {
  userId: string
  dashboard: Dashboard
  initialMessages: Message[]
  todayLogs: { task_id: string; completed: boolean; date: string }[]
  zynLog: { count: number; goal: number; date: string } | null
}

export default function DashboardShell({
  userId,
  dashboard,
  initialMessages,
  todayLogs,
  zynLog,
}: DashboardShellProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('chat') === 'open') {
      setChatOpen(true)
      router.replace('/dashboard')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [draftConfig, setDraftConfig] = useState<DashboardConfig | null>(null)
  const [draftMessageId, setDraftMessageId] = useState<string | null>(null)
  const [activeConfig, setActiveConfig] = useState(dashboard.config)
  const [promoting, setPromoting] = useState(false)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleNewVersion = useCallback((config: DashboardConfig, messageId: string) => {
    setDraftConfig(config)
    setDraftMessageId(messageId)
    setActiveConfig(config)
    setChatOpen(false)
  }, [])

  async function promoteToMain() {
    if (!draftConfig) return
    setPromoting(true)
    await supabase
      .from('dashboards')
      .update({
        config: draftConfig,
        promoted_from_message_id: draftMessageId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dashboard.id)
    setDraftConfig(null)
    setDraftMessageId(null)
    showToast('Dashboard updated ✓')
    router.refresh()
    setPromoting(false)
  }

  function closeDraft() {
    setDraftConfig(null)
    setDraftMessageId(null)
    setActiveConfig(dashboard.config)
  }

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>

      {/* Draft banner */}
      {draftConfig && (
        <div
          className="shrink-0 flex items-center justify-between px-5 py-2.5"
          style={{
            background: 'rgba(233,255,39,0.15)',
            borderBottom: '1px solid rgba(233,255,39,0.3)',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#111' }}
            />
            <span className="text-xs font-medium" style={{ color: '#111' }}>
              Draft — {draftConfig.title}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={closeDraft}
              className="text-xs opacity-40 hover:opacity-70 transition-opacity"
            >
              Discard
            </button>
            <button
              onClick={promoteToMain}
              disabled={promoting}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
            >
              {promoting ? 'Saving...' : 'Set as main'}
            </button>
          </div>
        </div>
      )}

      {/* Dashboard content — padded at bottom so content clears the fixed chat panel */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ paddingBottom: '120px' }}>
        <DashboardRenderer
          config={activeConfig}
          userId={userId}
          todayLogs={todayLogs}
          zynLog={zynLog}
          createdAt={dashboard.created_at}
        />
      </div>

      {/* Chat panel — fixed to bottom of viewport, always a floating card with side margins */}
      <div
        className="fixed bottom-0 left-0 right-0 flex justify-center z-40"
        style={{ padding: '0 16px 12px' }}
      >
        <div
          className="w-full flex flex-col overflow-hidden"
          style={{
            maxWidth: '960px',
            background: 'rgba(0,0,0,0.04)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '1.25rem',
            height: chatOpen ? '55dvh' : 'auto',
          }}
        >
          {chatOpen ? (
            <ChatThread
              initialMessages={initialMessages}
              userId={userId}
              isOnboarding={false}
              isFullPage={false}
              onNewDashboardVersion={handleNewVersion}
              collapsed={false}
              onToggleCollapse={() => setChatOpen(false)}
              autoSendMessage={pendingMessage}
              onAutoSendConsumed={() => setPendingMessage(null)}
            />
          ) : (
            <>
              {/* Collapsed header */}
              <div
                className="flex items-center justify-between px-4 py-2.5 shrink-0"
              >
                <span className="text-xs font-medium opacity-30" style={{ color: 'var(--text)' }}>
                  View thread
                </span>
                <button
                  onClick={() => setChatOpen(true)}
                  className="text-xs opacity-30 hover:opacity-60 transition-opacity px-1"
                >
                  ↑
                </button>
              </div>
              {/* Collapsed real input */}
              <div className="px-3 pb-3">
                <ChatInput
                  placeholder="Make changes..."
                  onSend={(msg) => {
                    setPendingMessage(msg)
                    setChatOpen(true)
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs font-medium z-50 shadow-sm"
          style={{ background: '#111', color: '#fff' }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
