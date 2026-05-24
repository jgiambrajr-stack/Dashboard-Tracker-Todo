'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ZynConfig {
  enabled: boolean
  dailyGoal: number
  quitPlan: { label: string; target: string }[]
}

interface ZynModuleProps {
  userId: string
  zynConfig: ZynConfig
  initialLog: { count: number; goal: number; date: string } | null
}

export default function ZynModule({ userId, zynConfig, initialLog }: ZynModuleProps) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const [count, setCount] = useState(initialLog?.count ?? 0)
  const [goal, setGoal] = useState(initialLog?.goal ?? zynConfig.dailyGoal)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState(String(initialLog?.goal ?? zynConfig.dailyGoal))

  const underGoal = count <= goal
  const statusColor = underGoal ? 'var(--success)' : 'var(--danger)'
  const pct = goal > 0 ? Math.min((count / goal) * 100, 100) : 0

  async function updateCount(newCount: number) {
    if (newCount < 0) return
    setCount(newCount)
    await supabase.from('zyn_logs').upsert(
      { user_id: userId, date: today, count: newCount, goal },
      { onConflict: 'user_id,date' }
    )
  }

  async function saveGoal() {
    const parsed = parseInt(goalInput)
    if (isNaN(parsed) || parsed < 0) { setEditingGoal(false); return }
    setGoal(parsed)
    setEditingGoal(false)
    await supabase.from('zyn_logs').upsert(
      { user_id: userId, date: today, count, goal: parsed },
      { onConflict: 'user_id,date' }
    )
  }

  const statusLabel = underGoal
    ? count === 0 ? 'None today' : `${goal - count} under goal`
    : `${count - goal} over goal`

  return (
    <div className="space-y-6 pb-4">
      {/* Big counter card */}
      <div
        className="rounded-2xl p-6 flex flex-col items-center"
        style={{
          background: 'rgba(0,0,0,0.03)',
          border: `1px solid ${underGoal ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
        }}
      >
        <div className="text-8xl font-medium tabular-nums leading-none mb-3" style={{ color: statusColor }}>
          {count}
        </div>
        <div className="w-full max-w-[180px] mb-3">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: statusColor }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span style={{ color: 'var(--text-secondary)' }}>goal:</span>
          {editingGoal ? (
            <form onSubmit={(e) => { e.preventDefault(); saveGoal() }}>
              <input
                autoFocus type="number" value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onBlur={saveGoal}
                className="w-10 text-center bg-transparent outline-none border-b text-xs"
                style={{ borderColor: '#111', color: '#111', fontFamily: 'inherit' }}
              />
            </form>
          ) : (
            <button
              onClick={() => setEditingGoal(true)}
              className="font-medium underline decoration-dotted underline-offset-2"
              style={{ color: statusColor }}
            >
              {goal}
            </button>
          )}
          <span style={{ color: 'var(--text-secondary)', opacity: 0.4 }} className="mx-1">·</span>
          <span style={{ color: statusColor, opacity: 0.7 }}>{statusLabel}</span>
        </div>
      </div>

      {/* +/- buttons */}
      <div className="flex items-center justify-center gap-8">
        <button
          onClick={() => updateCount(count - 1)}
          disabled={count === 0}
          className="w-16 h-16 rounded-2xl text-3xl font-light flex items-center justify-center transition-all active:scale-95 disabled:opacity-20"
          style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#111' }}
        >
          −
        </button>
        <div className="text-xs text-center" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>today</div>
        <button
          onClick={() => updateCount(count + 1)}
          className="w-16 h-16 rounded-2xl text-3xl font-light flex items-center justify-center transition-all active:scale-95"
          style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#111' }}
        >
          +
        </button>
      </div>

      {/* Quit plan */}
      {zynConfig.quitPlan?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Quit plan</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>
          <div className="space-y-1.5">
            {zynConfig.quitPlan.map((step, i) => (
              <div
                key={i}
                className="flex justify-between items-center px-4 py-2.5 rounded-xl text-xs"
                style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--border)' }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>{step.label}</span>
                <span className="font-medium" style={{ color: 'var(--success)' }}>≤ {step.target}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
