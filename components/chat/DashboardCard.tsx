'use client'

import { useState } from 'react'
import { DashboardConfig } from '@/lib/types'

interface DashboardCardProps {
  config: DashboardConfig
  messageId: string
  versionName: string | null
  onPromote: (config: DashboardConfig, messageId: string) => void
}

export default function DashboardCard({ config, messageId, versionName, onPromote }: DashboardCardProps) {
  const [promoting, setPromoting] = useState(false)

  async function handlePromote() {
    setPromoting(true)
    await onPromote(config, messageId)
    setPromoting(false)
  }

  return (
    <div
      className="w-full max-w-[85%] rounded-xl overflow-hidden text-xs"
      style={{
        background: 'rgba(0,0,0,0.03)',
        border: '1px solid rgba(233,255,39,0.4)',
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)', background: 'rgba(233,255,39,0.08)' }}
      >
        <div>
          <p className="font-medium" style={{ color: 'var(--text)' }}>{config.title}</p>
          {config.subtitle && (
            <p className="mt-0.5" style={{ color: 'var(--text-secondary)' }}>{config.subtitle}</p>
          )}
        </div>
        {versionName && (
          <span className="opacity-30 text-[10px] ml-2 shrink-0">{versionName}</span>
        )}
      </div>

      {/* Task preview */}
      <div className="px-3 py-2 space-y-1 max-h-40 overflow-y-auto">
        {config.dailyTasks.slice(0, 6).map((task) => (
          <div key={task.id} className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <div
              className="w-3 h-3 rounded shrink-0"
              style={{ border: '1px solid var(--border)' }}
            />
            <span>{task.icon} {task.label}</span>
          </div>
        ))}
        {config.dailyTasks.length > 6 && (
          <p className="pl-5" style={{ color: 'var(--text-secondary)', opacity: 0.4 }}>
            +{config.dailyTasks.length - 6} more
          </p>
        )}
      </div>

      {/* Project chips */}
      {config.projects?.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {config.projects.map((p) => (
            <span
              key={p.id}
              className="px-2 py-0.5 rounded-full text-[10px]"
              style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              {p.icon} {p.label}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="px-3 py-2.5 flex gap-2" style={{ borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handlePromote}
          disabled={promoting}
          className="flex-1 py-1.5 rounded-lg font-medium transition-opacity disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
        >
          {promoting ? 'Setting...' : 'Set as My Dashboard'}
        </button>
      </div>
    </div>
  )
}
