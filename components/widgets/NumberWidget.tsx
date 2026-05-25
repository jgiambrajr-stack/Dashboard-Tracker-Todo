'use client'

// NumberWidget — for countable or measurable daily values.
// Examples: water bottles (unit="bottles", step=1, goal=8)
//           weight log (unit="lbs", step=0.1, showGraph=true)
//           calories, steps, push-ups, pages read

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrackerWidget } from '@/lib/types'
import BarChart from './BarChart'

interface NumberWidgetProps {
  widget: TrackerWidget
  userId: string
  todayValue: number | null
  history: { date: string; value: number }[]
  accentColor?: string
}

function calcStreak(history: { date: string; value: number }[], goal?: number): number {
  const today = new Date().toISOString().split('T')[0]
  const byDate: Record<string, number> = {}
  history.forEach((h) => { byDate[h.date] = h.value })

  let streak = 0
  for (let i = 0; i <= 60; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const val = byDate[dateStr] ?? 0

    if (dateStr === today && val === 0) continue  // today not logged yet — don't break streak

    const met = goal !== undefined ? val >= goal : val > 0
    if (met) {
      streak++
    } else {
      break
    }
  }
  return streak
}

function calcAvg(history: { date: string; value: number }[], days = 14): number {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const recent = history.filter((h) => new Date(h.date) >= cutoff && h.value > 0)
  if (recent.length === 0) return 0
  return recent.reduce((s, h) => s + h.value, 0) / recent.length
}

export default function NumberWidget({
  widget,
  userId,
  todayValue,
  history,
  accentColor = '#ff7820',
}: NumberWidgetProps) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const step = widget.step ?? 1

  const [value, setValue] = useState<number>(todayValue ?? 0)
  const [editing, setEditing] = useState(false)
  const [inputStr, setInputStr] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const streak = calcStreak([...history.filter(h => h.date !== today), { date: today, value }], widget.goal)
  const avg = calcAvg(history)
  const chartHistory = [...history.filter(h => h.date !== today), ...(value > 0 ? [{ date: today, value }] : [])]

  const overGoal = widget.goal !== undefined && value > widget.goal
  const atGoal = widget.goal !== undefined && value >= widget.goal
  const statusColor = overGoal ? 'var(--danger)' : atGoal ? 'var(--success)' : 'var(--text)'

  async function persist(newVal: number) {
    const clamped = Math.max(0, Math.round(newVal / step) * step)
    setValue(clamped)
    await supabase.from('widget_logs').upsert(
      { user_id: userId, widget_id: widget.id, date: today, value: clamped },
      { onConflict: 'user_id,widget_id,date' }
    )
  }

  function startEdit() {
    setInputStr(value > 0 ? String(value) : '')
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 10)
  }

  function commitEdit() {
    const parsed = parseFloat(inputStr)
    setEditing(false)
    if (!isNaN(parsed) && parsed >= 0) {
      persist(parsed)
    }
  }

  const displayValue = step < 1 ? value.toFixed(1) : String(Math.round(value))

  return (
    <div className="space-y-4 pb-2">
      {/* Stat cards row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: widget.goal ? 'Daily Goal' : 'Today',
            value: widget.goal ? String(widget.goal) : (value > 0 ? displayValue : '—'),
            sub: widget.unit,
          },
          { label: 'Day Streak', value: streak > 0 ? String(streak) : '—', sub: streak === 1 ? 'day' : 'days' },
          { label: '14-Day Avg', value: avg > 0 ? (step < 1 ? avg.toFixed(1) : Math.round(avg).toString()) : '—', sub: widget.unit },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-3 flex flex-col items-center justify-center text-center"
            style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}
          >
            <span
              className="text-2xl font-medium tabular-nums leading-none"
              style={{ color: accentColor }}
            >
              {card.value}
            </span>
            <span
              className="text-[9px] uppercase tracking-widest mt-1.5"
              style={{ color: 'rgba(17,17,17,0.35)' }}
            >
              {card.label}
            </span>
          </div>
        ))}
      </div>

      {/* Main counter */}
      <div
        className="rounded-2xl p-6 flex flex-col items-center gap-4"
        style={{
          background: 'rgba(0,0,0,0.03)',
          border: `1px solid ${atGoal ? 'rgba(34,197,94,0.2)' : overGoal ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        {/* Big value — tap to edit */}
        <button
          onClick={startEdit}
          className="leading-none font-medium tabular-nums transition-opacity active:opacity-60"
          style={{ fontSize: '72px', color: statusColor }}
        >
          {editing ? (
            <input
              ref={inputRef}
              type="number"
              value={inputStr}
              onChange={(e) => setInputStr(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
              className="w-48 text-center bg-transparent outline-none tabular-nums"
              style={{ fontSize: 'inherit', color: 'inherit', fontFamily: 'inherit', fontWeight: 'inherit' }}
              autoFocus
            />
          ) : (
            displayValue
          )}
        </button>

        {/* Unit label */}
        {widget.unit && (
          <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(17,17,17,0.3)' }}>
            {widget.unit} today
          </span>
        )}

        {/* Goal status */}
        {widget.goal !== undefined && (
          <span className="text-xs" style={{ color: atGoal ? 'var(--success)' : overGoal ? 'var(--danger)' : 'rgba(17,17,17,0.4)' }}>
            {atGoal && !overGoal ? 'Goal reached ✓' : overGoal ? `${(value - widget.goal).toFixed(step < 1 ? 1 : 0)} over goal` : `${(widget.goal - value).toFixed(step < 1 ? 1 : 0)} to go`}
          </span>
        )}
      </div>

      {/* +/− buttons */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => persist(value - step)}
          disabled={value <= 0}
          className="w-14 h-14 rounded-2xl text-2xl font-light flex items-center justify-center transition-all active:scale-95 disabled:opacity-20"
          style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#111' }}
        >
          −
        </button>
        <div className="text-[10px] uppercase tracking-widest text-center" style={{ color: 'rgba(17,17,17,0.3)' }}>
          {step < 1 ? `±${step}` : `+${step}`}
        </div>
        <button
          onClick={() => persist(value + step)}
          className="w-14 h-14 rounded-2xl text-2xl font-light flex items-center justify-center transition-all active:scale-95"
          style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#111' }}
        >
          +
        </button>
      </div>

      {/* Chart */}
      <div>
        <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'rgba(17,17,17,0.3)' }}>
          Last 14 days
        </p>
        <BarChart data={chartHistory} goal={widget.goal} color={accentColor} />
      </div>
    </div>
  )
}
