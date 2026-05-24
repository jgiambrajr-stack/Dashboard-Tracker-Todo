'use client'

import { Message, DashboardConfig } from '@/lib/types'
import DashboardCard from './DashboardCard'

interface MessageBubbleProps {
  message: Omit<Message, 'user_id'> & { user_id?: string }
  streaming?: boolean
  onPromote?: (config: DashboardConfig, messageId: string) => void
}

export default function MessageBubble({ message, streaming, onPromote }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser ? 'rounded-br-sm' : 'rounded-bl-sm'
        }`}
        style={{
          background: isUser
            ? 'rgba(233,255,39,0.2)'
            : 'rgba(0,0,0,0.03)',
          border: `1px solid ${isUser ? 'rgba(233,255,39,0.4)' : 'rgba(0,0,0,0.08)'}`,
          color: 'var(--text)',
        }}
      >
        {message.content}
        {streaming && (
          <span
            className="inline-block w-0.5 h-3.5 ml-0.5 align-middle animate-pulse"
            style={{ background: 'var(--text)' }}
          />
        )}
      </div>

      {message.is_dashboard_version && message.dashboard_snapshot && onPromote && (
        <DashboardCard
          config={message.dashboard_snapshot}
          messageId={message.id}
          versionName={message.version_name}
          onPromote={onPromote}
        />
      )}
    </div>
  )
}
