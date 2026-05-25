'use client'

// DurationWidget — for time-based tracking.
// Examples: reading time (unit="min", step=15, goal=30)
//           screen time limit, workout duration, focus sessions

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrackerWidget } from '@/lib/types'
import BarChart from './BarChart'

interface DurationWidgetProps {
  widget: TrackerWidget
  userId: string
  todayValue: number | null   // stored in minutes
  history: { date: string; value: number }[]
  accentColor?: string
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function calcStreak(history: { date: string; value: number }[], goal: number | undefined, today: string): number {
  const byDate: Record<string, number> = {}
  history.forEach((h) => { byDate[h.date] = h.value })

  let streak = 0
  for (let i = 0; i <= 60; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]

    if (dateStr === today && !byDate[dateStr]) continue

    const met = goal !== undefined ? (byDate[dateStr] ?? 0) >= goal : (byDate[dateStr] ?? 0) > 0
    if (met) streak++
    else break
  }
  return streak
}

function calcAvgMins(history: { date: string; value: number }[], days = 14): number {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const recent = history.filter((h) => new Date(h.date + 'T00:00') >= cutoff && h.value > 0)
  if (!recent.length) return 0
  return recent.reduce((s, h) => s + h.value, 0) / recent.length
}

const PRESETS = [5, 10, 15, 20, 30, 45, 60, 90]

export default function DurationWidget({
  widget,
  userId,
  todayValue,
  history,
  accentColor = '#ff7820',
}: DurationWidgetProps) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const step = widget.step ?? 15

  const [minutes, setMinutes] = useState(todayValue ?? 0)

  const streak = calcStreak([...history.filter(h => h.date !== today), { date: today, value: minutes }], widget.goal, today)
  const avgMins = calcAvgMins(history)
  const chartHistory = [...history.filter(h => h.date !== today), ...(minutes > 0 ? [{ date: today, value: minutes }] : [])]

  const atGoal = widget.goal !== undefined && minutes >= widget.goal
  const overGoal = widget.goal !== undefined && minutes > widget.goal

  async function persist(newMins: number) {
    const clamped = Math.max(0, newMins)
    setMinutes(clamped)
    await supabase.from('widget_logs').upsert(
      { user_id: userId, widget_id: widget.id, date: today, value: clamped },
      { onConflict: 'user_id,widget_id,date' }
    )
  }

  return (
    <div className="space-y-4 pb-2">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: widget.goal ? 'Daily Goal' : 'Today', value: widget.goal ? formatDuration(widget.goal) : (minutes > 0 ? formatDuration(minutes) : '—') },
          { label: 'Day Streak', value: streak > 0 ? String(streak) : '—' },
          { label: '14-Day Avg', value: avgMins > 0 ? formatDuration(Math.round(avgMins)) : '—' },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-3 flex flex-col items-center justify-center text-center"
            style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}
          >
            <span className="text-2xl font-medium tabular-nums leading-none" style={{ color: accentColor }}>
              {card.value}
            </span>
            <span className="text-[9px] uppercase tracking-widest mt-1.5" style={{ color: 'rgba(17,17,17,0.35)' }}>
              {card.label}
            </span>
          </div>
        ))}
      </div>

      {/* Big display */}
      <div
        className="rounded-2xl p-6 flex flex-col items-center gap-3"
        style={{
          background: 'rgba(0,0,0,0.03)',
          border: `1px solid ${atGoal ? 'rgba(34,197,94,0.2)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <div className="text-[72px] font-medium tabular-nums leading-none" style={{ color: atGoal ? 'var(--success)' : 'var(--text)' }}>
          {minutes > 0 ? formatDuration(minutes) : '0m'}
        </div>
        {widget.unit && (
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(17,17,17,0.3)' }}>
            {widget.unit} today
          </span>
        )}
        {widget.goal !== undefined && (
          <span className="text-xs" style={{ color: atGoal ? 'var(--success)' : 'rgba(17,17,17,0.4)' }}>
            {atGoal ? 'Goal reached ✓' : `${formatDuration(widget.goal - minutes)} to go`}
          </span>
        )}
      </div>

      {/* +/− step buttons */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => persist(minutes - step)}
          disabled={minutes <= 0}
          className="w-14 h-14 rounded-2xl text-2xl font-light flex items-center justify-center transition-all active:scale-95 disabled:opacity-20"
          style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#111' }}
        >
          −
        </button>
        <div className="text-[10px] uppercase tracking-widest text-center" style={{ color: 'rgba(17,17,17,0.3)' }}>
          {step}m
        </div>
        <button
          onClick={() => persist(minutes + step)}
          className="w-14 h-14 rounded-2xl text-2xl font-light flex items-center justify-center transition-all active:scale-95"
          style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#111' }}
        >
          +
        </button>
      </div>

      {/* Quick-add presets */}
      <div className="flex gap-1.5 flex-wrap">
        {PRESETS.filter((p) => p !== step).map((p) => (
          <button
            key={p}
            onClick={() => persist(minutes + p)}
            className="px-3 py-1.5 rounded-lg text-xs transition-all active:scale-95 hover:opacity-70"
            style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: 'rgba(17,17,17,0.6)' }}
          >
            +{formatDuration(p)}
          </button>
        ))}
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
