'use client'

// CheckboxWidget — simple done / not-done habit with streak tracking.
// Examples: cold shower, meditation, no alcohol, journaling

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrackerWidget } from '@/lib/types'

interface CheckboxWidgetProps {
  widget: TrackerWidget
  userId: string
  todayValue: number | null   // 1 = done, 0 = not done
  history: { date: string; value: number }[]
  accentColor?: string
}

function getLastNDates(n: number): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    out.push(d.toISOString().split('T')[0])
  }
  return out
}

function calcStreak(history: { date: string; value: number }[], today: string, todayDone: boolean): number {
  const byDate: Record<string, boolean> = {}
  history.forEach((h) => { byDate[h.date] = h.value >= 1 })
  byDate[today] = todayDone

  let streak = 0
  for (let i = 0; i <= 365; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]

    // today not yet checked doesn't break streak
    if (dateStr === today && !todayDone) continue

    if (byDate[dateStr]) {
      streak++
    } else {
      break
    }
  }
  return streak
}

function calcCompletionRate(history: { date: string; value: number }[], days: number): number {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const recent = history.filter((h) => new Date(h.date + 'T00:00') >= cutoff)
  if (!recent.length) return 0
  const done = recent.filter((h) => h.value >= 1).length
  return Math.round((done / days) * 100)
}

export default function CheckboxWidget({
  widget,
  userId,
  todayValue,
  history,
  accentColor = '#ff7820',
}: CheckboxWidgetProps) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const [done, setDone] = useState(todayValue === 1)
  const [animating, setAnimating] = useState(false)

  const streak = calcStreak(history, today, done)
  const rate14 = calcCompletionRate([...history.filter(h => h.date !== today), { date: today, value: done ? 1 : 0 }], 14)
  const last14 = getLastNDates(14)
  const byDate: Record<string, boolean> = {}
  history.forEach((h) => { byDate[h.date] = h.value >= 1 })
  byDate[today] = done

  async function toggle() {
    const newDone = !done
    setDone(newDone)
    setAnimating(true)
    setTimeout(() => setAnimating(false), 300)

    await supabase.from('widget_logs').upsert(
      { user_id: userId, widget_id: widget.id, date: today, value: newDone ? 1 : 0 },
      { onConflict: 'user_id,widget_id,date' }
    )
  }

  return (
    <div className="space-y-5 pb-2">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Today', value: done ? '✓' : '—' },
          { label: 'Day Streak', value: streak > 0 ? String(streak) : '—' },
          { label: '14-Day Rate', value: `${rate14}%` },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-3 flex flex-col items-center justify-center text-center"
            style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}
          >
            <span className="text-2xl font-medium leading-none" style={{ color: done && card.label === 'Today' ? 'var(--success)' : accentColor }}>
              {card.value}
            </span>
            <span className="text-[9px] uppercase tracking-widest mt-1.5" style={{ color: 'rgba(17,17,17,0.35)' }}>
              {card.label}
            </span>
          </div>
        ))}
      </div>

      {/* Big toggle button */}
      <button
        onClick={toggle}
        className="w-full rounded-2xl flex flex-col items-center justify-center gap-3 py-10 transition-all active:scale-[0.98]"
        style={{
          background: done ? `${accentColor}15` : 'rgba(0,0,0,0.03)',
          border: done ? `1.5px solid ${accentColor}40` : '1px solid rgba(0,0,0,0.06)',
        }}
      >
        {/* Check circle */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center transition-all"
          style={{
            background: done ? accentColor : 'rgba(0,0,0,0.06)',
            border: done ? `2px solid ${accentColor}` : '2px solid rgba(0,0,0,0.12)',
            transform: animating ? 'scale(1.15)' : 'scale(1)',
          }}
        >
          {done && (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 14l6 6 10-10" />
            </svg>
          )}
        </div>
        <span
          className="text-sm font-medium"
          style={{ color: done ? accentColor : 'rgba(17,17,17,0.4)' }}
        >
          {done ? 'Done today' : 'Mark as done'}
        </span>
      </button>

      {/* 14-day calendar dots */}
      <div>
        <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'rgba(17,17,17,0.3)' }}>
          Last 14 days
        </p>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(14, 1fr)' }}>
          {last14.map((date) => {
            const isT = date === today
            const isDone = byDate[date]

            return (
              <div
                key={date}
                className="aspect-square rounded-sm"
                style={{
                  background: isDone
                    ? isT ? accentColor : `${accentColor}88`
                    : 'rgba(0,0,0,0.06)',
                  outline: isT ? `2px solid ${accentColor}50` : 'none',
                  outlineOffset: '1px',
                }}
                title={date}
              />
            )
          })}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[8px]" style={{ color: 'rgba(17,17,17,0.25)' }}>14 days ago</span>
          <span className="text-[8px]" style={{ color: 'rgba(17,17,17,0.25)' }}>today</span>
        </div>
      </div>

      {/* Motivational streak message */}
      {streak >= 3 && (
        <div
          className="rounded-xl px-4 py-3 text-xs text-center"
          style={{ background: `${accentColor}12`, color: accentColor }}
        >
          {streak >= 30 ? `🔥 ${streak}-day streak. Unstoppable.` :
           streak >= 14 ? `🔥 ${streak} days straight. Keep it locked in.` :
           streak >= 7 ? `⚡ ${streak}-day streak. One week strong.` :
           `${streak} days in a row. Build the habit.`}
        </div>
      )}
    </div>
  )
}
