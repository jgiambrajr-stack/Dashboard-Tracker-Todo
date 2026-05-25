'use client'

import { Message, DashboardConfig } from '@/lib/types'
import DashboardCard from './DashboardCard'

interface MessageBubbleProps {
  message: Omit<Message, 'user_id'> & { user_id?: string }
  streaming?: boolean
  onPromote?: (config: DashboardConfig, messageId: string) => void
  userId?: string
  allMessages?: (Omit<Message, 'user_id'> & { user_id?: string })[]
}

export default function MessageBubble({ message, streaming, onPromote, userId, allMessages }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
      {isUser ? (
        <div
          className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ background: 'rgba(255,255,255,0.85)', color: 'rgba(17,17,17,0.5)' }}
        >
          {message.content}
        </div>
      ) : (
        <div
          className="max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap px-1"
          style={{ color: 'var(--text)' }}
        >
          {message.content}
          {streaming && (
            <span
              className="inline-block w-0.5 h-3.5 ml-0.5 align-middle animate-pulse"
              style={{ background: 'var(--text)' }}
            />
          )}
        </div>
      )}

      {message.is_dashboard_version && message.dashboard_snapshot && onPromote && (
        <DashboardCard
          config={message.dashboard_snapshot}
          messageId={message.id}
          versionName={message.version_name}
          createdAt={message.created_at}
          onPromote={onPromote}
          userId={userId}
          allMessages={allMessages ?? []}
        />
      )}
    </div>
  )
}
