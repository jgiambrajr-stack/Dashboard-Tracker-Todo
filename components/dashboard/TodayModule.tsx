'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DashboardConfig } from '@/lib/types'

interface TodayModuleProps {
  config: DashboardConfig
  userId: string
  initialLogs: { task_id: string; completed: boolean; date: string }[]
}

export default function TodayModule({ config, userId, initialLogs }: TodayModuleProps) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const [completed, setCompleted] = useState<Set<string>>(
    new Set(initialLogs.filter((l) => l.completed).map((l) => l.task_id))
  )

  async function toggleTask(taskId: string) {
    const nowCompleted = !completed.has(taskId)
    setCompleted((prev) => {
      const next = new Set(prev)
      nowCompleted ? next.add(taskId) : next.delete(taskId)
      return next
    })
    await supabase.from('daily_logs').upsert(
      { user_id: userId, date: today, task_id: taskId, completed: nowCompleted },
      { onConflict: 'user_id,date,task_id' }
    )
  }

  function normalizeCategory(cat: string): 'body' | 'mind' | 'custom' {
    const lower = (cat ?? '').toLowerCase()
    if (lower === 'body') return 'body'
    if (lower === 'mind') return 'mind'
    return 'custom'
  }

  const doneCount = completed.size
  const totalCount = config.dailyTasks.length
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const groups = [
    { key: 'body', label: 'Body' },
    { key: 'mind', label: 'Mind' },
    { key: 'custom', label: 'Other' },
  ]
    .map((g) => ({
      ...g,
      tasks: config.dailyTasks.filter((t) => normalizeCategory(t.category) === g.key),
    }))
    .filter((g) => g.tasks.length > 0)


  return (
    <div className="space-y-6 pb-4">
      {/* Progress */}
      <div
        className="rounded-2xl px-4 py-3.5"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>today's progress</span>
          <span
            className="text-xs font-medium"
            style={{ color: pct === 100 ? 'var(--success)' : 'var(--text)' }}
          >
            {doneCount}/{totalCount}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: pct === 100 ? 'var(--success)' : 'var(--accent)',
            }}
          />
        </div>
        {pct === 100 && (
          <p className="text-xs mt-2 text-center font-medium" style={{ color: 'var(--success)' }}>
            All done — locked in ✓
          </p>
        )}
      </div>

      {/* Task groups */}
      {groups.map((group) => (
        <div key={group.key}>
          <div className="mb-2">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
              {group.label}
            </span>
          </div>

          <div className="space-y-1.5">
            {group.tasks.map((task) => {
              const done = completed.has(task.id)
              return (
                <button
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all active:scale-[0.99]"
                  style={{
                    background: done ? 'rgba(233,255,39,0.12)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${done ? 'rgba(233,255,39,0.35)' : 'rgba(0,0,0,0.07)'}`,
                  }}
                >
                  {/* Checkbox */}
                  <div
                    className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center transition-all duration-200"
                    style={{
                      background: done ? 'var(--accent)' : 'transparent',
                      border: `1.5px solid ${done ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.15)'}`,
                    }}
                  >
                    {done && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="#111111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  <span className="text-base leading-none">{task.icon}</span>

                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm leading-snug transition-all duration-200"
                      style={{
                        color: done ? 'rgba(17,17,17,0.3)' : 'var(--text)',
                        textDecoration: done ? 'line-through' : 'none',
                        textDecorationColor: 'rgba(17,17,17,0.2)',
                      }}
                    >
                      {task.label}
                    </p>
                    {task.detail && (
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {task.detail}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {config.dailyTasks.length === 0 && (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
          No tasks yet — chat to add some
        </div>
      )}
    </div>
  )
}
