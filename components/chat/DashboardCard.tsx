'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Message, DashboardConfig } from '@/lib/types'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'

interface DashboardCardProps {
  config: DashboardConfig
  messageId: string
  versionName: string | null
  createdAt: string
  isCurrentMain?: boolean
  onPromote: (config: DashboardConfig, messageId: string) => void
  userId?: string
  allMessages?: (Omit<Message, 'user_id'> & { user_id?: string })[]
  isActiveArtifact?: boolean
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays} days ago`
}

export default function DashboardCard({
  config,
  messageId,
  createdAt,
  isCurrentMain,
  onPromote,
  userId,
  allMessages = [],
  isActiveArtifact = false,
}: DashboardCardProps) {
  const [open, setOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const status = isCurrentMain ? 'Main dashboard' : 'Draft'
  const when = timeAgo(createdAt)

  useEffect(() => {
    if (chatOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatOpen])

  async function handlePromote() {
    setPromoting(true)
    await onPromote(config, messageId)
    setPromoting(false)
    setOpen(false)
  }

  return (
    <>
      {/* Chip — active state when artifact is open */}
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer w-full max-w-[85%] transition-all"
        style={{
          background: open ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.04)',
          border: isActiveArtifact ? '1.5px solid rgba(0,0,0,0.35)' : `1px solid ${open ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.07)'}`,
        }}
        onClick={() => setOpen(true)}
      >
        <div
          className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
          style={{ background: open ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.06)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
            <rect x="1" y="1" width="6" height="6" rx="1.5" />
            <rect x="9" y="1" width="6" height="6" rx="1.5" />
            <rect x="1" y="9" width="6" height="6" rx="1.5" />
            <rect x="9" y="9" width="6" height="6" rx="1.5" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{config.title}</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(17,17,17,0.4)' }}>{status} · {when}</p>
        </div>
        <span className="text-xs opacity-20">↗</span>
      </div>

      {/* Full-page artifact view */}
      {open && createPortal(
        <div className="fixed inset-0 z-50" style={{ background: 'var(--bg)' }}>
          {/* Background blurs */}
          <img src="/blurs/black.png" alt="" style={{ position: 'absolute', top: '-10%', right: '5%', width: '30vw', maxWidth: '360px', opacity: 0.6, mixBlendMode: 'multiply', pointerEvents: 'none' } as React.CSSProperties} />
          <img src="/blurs/yellow.png" alt="" style={{ position: 'absolute', top: '-20%', right: '-20%', width: '55vw', maxWidth: '600px', opacity: 0.9, pointerEvents: 'none' } as React.CSSProperties} />

          {/* Card */}
          <div
            className="absolute flex flex-col overflow-hidden"
            style={{
              top: '36px', left: '36px', right: '36px', bottom: '-24px',
              background: 'rgba(248,248,248,0.98)',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: '1.25rem',
            }}
          >
            {/* Header */}
            <div className="shrink-0 flex items-start justify-between px-6 pt-5 pb-4">
              <div>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgba(17,17,17,0.35)' }}>
                  {status} · {when}
                </p>
                <h2 className="text-2xl font-normal tracking-tight" style={{ color: 'var(--text)' }}>
                  {config.title}
                </h2>
                {config.subtitle && (
                  <p className="text-sm mt-0.5" style={{ color: 'rgba(17,17,17,0.45)' }}>{config.subtitle}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                {!isCurrentMain && (
                  <button
                    onClick={handlePromote}
                    disabled={promoting}
                    className="text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 transition-all"
                    style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--text)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#111'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; e.currentTarget.style.color = 'var(--text)' }}
                  >
                    {promoting ? 'Setting...' : 'Set as main'}
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full opacity-30 hover:opacity-60 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.08)' }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M1 1l8 8M9 1l-8 8" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
              <div className="space-y-2 mb-4">
                {config.dailyTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm"
                    style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', color: 'var(--text)' }}
                  >
                    <div className="w-4 h-4 rounded shrink-0" style={{ border: '1px solid rgba(0,0,0,0.15)' }} />
                    {task.icon} {task.label}
                  </div>
                ))}
              </div>
              {config.projects?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {config.projects.map((p) => (
                    <span key={p.id} className="px-3 py-1 rounded-full text-xs"
                      style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.08)', color: 'var(--text)' }}>
                      {p.icon} {p.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Chat panel — same style as dashboard */}
            <div className="shrink-0 flex justify-center" style={{ padding: '0 16px 36px' }}>
              <div
                className="w-full flex flex-col overflow-hidden"
                style={{
                  maxWidth: '960px',
                  background: 'rgba(0,0,0,0.04)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '1.25rem',
                  height: chatOpen ? '40dvh' : 'auto',
                }}
              >
                {chatOpen ? (
                  <>
                    {/* Thread header */}
                    <div className="shrink-0 flex items-center justify-between px-4 py-2.5">
                      <span className="text-xs font-medium opacity-30" style={{ color: 'var(--text)' }}>Chat thread</span>
                      <button onClick={() => setChatOpen(false)} className="text-xs opacity-30 hover:opacity-60 transition-opacity">↓</button>
                    </div>
                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-3 min-h-0">
                      {allMessages.map((msg) => (
                        <MessageBubble
                          key={msg.id}
                          message={msg}
                          onPromote={onPromote}
                          userId={userId}
                          allMessages={allMessages}
                          activeArtifactId={messageId}
                        />
                      ))}
                    </div>
                    {/* Input */}
                    <div className="shrink-0 px-3 pb-3 pt-0">
                      <ChatInput placeholder="Make changes..." onSend={() => {}} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-4 py-2.5 shrink-0 cursor-pointer" onClick={() => setChatOpen(true)}>
                      <span className="text-xs font-medium opacity-30 hover:opacity-60 transition-opacity" style={{ color: 'var(--text)' }}>View thread</span>
                      <span className="text-xs opacity-30 hover:opacity-60 transition-opacity px-1">↑</span>
                    </div>
                    <div className="px-3 pb-3">
                      <ChatInput placeholder="Make changes..." onSend={() => setChatOpen(true)} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
