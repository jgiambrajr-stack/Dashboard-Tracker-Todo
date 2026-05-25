'use client'

// ScaleWidget — for 1-10 daily ratings.
// Examples: mood, energy, sleep quality, focus level

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrackerWidget } from '@/lib/types'

interface ScaleWidgetProps {
  widget: TrackerWidget
  userId: string
  todayValue: number | null
  history: { date: string; value: number }[]
  accentColor?: string
}

function calcStreak(history: { date: string; value: number }[], min: number, today: string): number {
  const byDate: Record<string, number> = {}
  history.forEach((h) => { byDate[h.date] = h.value })
  let streak = 0
  for (let i = 0; i <= 60; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    if (dateStr === today && !byDate[dateStr]) continue
    if (byDate[dateStr] >= min) streak++
    else break
  }
  return streak
}

function calcAvg(history: { date: string; value: number }[], days = 7): number {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const recent = history.filter((h) => new Date(h.date + 'T00:00') >= cutoff && h.value > 0)
  if (!recent.length) return 0
  return recent.reduce((s, h) => s + h.value, 0) / recent.length
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

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

export default function ScaleWidget({
  widget,
  userId,
  todayValue,
  history,
  accentColor = '#ff7820',
}: ScaleWidgetProps) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const min = widget.min ?? 1
  const max = widget.max ?? 10
  const steps = Array.from({ length: max - min + 1 }, (_, i) => i + min)
  const goodThreshold = Math.ceil((min + max) / 2) + 1

  const [rating, setRating] = useState<number | null>(todayValue)
  const [hovered, setHovered] = useState<number | null>(null)

  const streak = calcStreak([...history.filter(h => h.date !== today), ...(rating ? [{ date: today, value: rating }] : [])], goodThreshold, today)
  const avg = calcAvg([...history.filter(h => h.date !== today), ...(rating ? [{ date: today, value: rating }] : [])])

  const last7 = getLastNDates(7)
  const byDate: Record<string, number> = {}
  history.forEach((h) => { byDate[h.date] = h.value })
  if (rating) byDate[today] = rating

  async function handleRate(v: number) {
    setRating(v)
    await supabase.from('widget_logs').upsert(
      { user_id: userId, widget_id: widget.id, date: today, value: v },
      { onConflict: 'user_id,widget_id,date' }
    )
  }

  const activeVal = hovered ?? rating
  const rgb = hexToRgb(accentColor.startsWith('#') ? accentColor : '#ff7820')

  return (
    <div className="space-y-5 pb-2">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Today', value: rating !== null ? String(rating) : '—' },
          { label: 'Day Streak', value: streak > 0 ? String(streak) : '—' },
          { label: '7-Day Avg', value: avg > 0 ? avg.toFixed(1) : '—' },
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

      {/* Big current rating */}
      <div
        className="rounded-2xl p-8 flex flex-col items-center gap-2"
        style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div className="text-[80px] font-medium tabular-nums leading-none" style={{ color: accentColor }}>
          {activeVal ?? '—'}
        </div>
        <div className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(17,17,17,0.3)' }}>
          out of {max}
        </div>
      </div>

      {/* Scale selector */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div className="flex gap-1.5 justify-between">
          {steps.map((v) => {
            const isActive = rating === v
            const isHovered = hovered === v
            const intensity = (v - min) / (max - min)

            return (
              <button
                key={v}
                onClick={() => handleRate(v)}
                onMouseEnter={() => setHovered(v)}
                onMouseLeave={() => setHovered(null)}
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all active:scale-95"
                style={{
                  background: isActive
                    ? accentColor
                    : isHovered
                      ? `rgba(${rgb},0.15)`
                      : `rgba(${rgb},${0.04 + intensity * 0.08})`,
                  border: isActive ? `1px solid ${accentColor}` : '1px solid transparent',
                }}
              >
                <span
                  className="text-sm font-medium"
                  style={{ color: isActive ? '#fff' : 'var(--text)' }}
                >
                  {v}
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex justify-between mt-2 px-1">
          <span className="text-[9px]" style={{ color: 'rgba(17,17,17,0.3)' }}>low</span>
          <span className="text-[9px]" style={{ color: 'rgba(17,17,17,0.3)' }}>high</span>
        </div>
      </div>

      {/* 7-day sparkline dots */}
      <div>
        <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'rgba(17,17,17,0.3)' }}>
          Last 7 days
        </p>
        <div className="flex items-end gap-2 h-10">
          {last7.map((date) => {
            const v = byDate[date]
            const isT = date === today
            const pct = v ? (v - min) / (max - min) : 0
            const barH = v ? Math.max(pct * 36 + 4, 6) : 3

            return (
              <div key={date} className="flex-1 flex flex-col items-center justify-end gap-1">
                <div
                  className="w-full rounded-sm transition-all"
                  style={{
                    height: `${barH}px`,
                    background: v
                      ? isT ? accentColor : `${accentColor}88`
                      : 'rgba(0,0,0,0.08)',
                  }}
                />
                <span className="text-[8px]" style={{ color: isT ? 'rgba(17,17,17,0.5)' : 'rgba(17,17,17,0.2)' }}>
                  {isT ? '·' : ''}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
