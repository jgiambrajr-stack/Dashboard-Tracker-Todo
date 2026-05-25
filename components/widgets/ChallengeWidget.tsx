'use client'

// ChallengeWidget — time-bound challenges with daily check-ins.
// Examples: 21-Day Lock In, 75 Hard, 30-day no-sugar, Dry January
//
// Start date stored in widget_metadata. Daily completions in widget_logs.

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrackerWidget } from '@/lib/types'

interface ChallengeWidgetProps {
  widget: TrackerWidget
  userId: string
  history: { date: string; value: number }[]  // 1 = checked in, 0 = missed
  accentColor?: string
}

function getDateStr(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0]
}

function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

function getDayGrid(startDate: string, totalDays: number): string[] {
  return Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(startDate + 'T00:00:00')
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

// SVG ring progress
function ProgressRing({ pct, color, size = 120 }: { pct: number; color: string; size?: number }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.min(pct, 1) * circ

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  )
}

export default function ChallengeWidget({
  widget,
  userId,
  history,
  accentColor = '#ff7820',
}: ChallengeWidgetProps) {
  const supabase = createClient()
  const totalDays = widget.challengeDays ?? 21
  const today = getDateStr()

  const [startDate, setStartDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkedDates, setCheckedDates] = useState<Record<string, boolean>>(
    Object.fromEntries(history.map((h) => [h.date, h.value >= 1]))
  )

  useEffect(() => {
    async function loadMeta() {
      const { data } = await supabase
        .from('widget_metadata')
        .select('value')
        .eq('user_id', userId)
        .eq('widget_id', widget.id)
        .eq('key', 'start_date')
        .single()
      setStartDate(data?.value ?? null)
      setLoading(false)
    }
    loadMeta()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function startChallenge() {
    await supabase.from('widget_metadata').upsert(
      { user_id: userId, widget_id: widget.id, key: 'start_date', value: today },
      { onConflict: 'user_id,widget_id,key' }
    )
    setStartDate(today)
  }

  async function toggleDay(date: string) {
    if (!startDate) return
    const dayIndex = daysBetween(startDate, date)
    if (dayIndex < 0 || dayIndex >= totalDays) return
    // Only allow today or past days
    if (date > today) return

    const newDone = !checkedDates[date]
    setCheckedDates((prev) => ({ ...prev, [date]: newDone }))
    await supabase.from('widget_logs').upsert(
      { user_id: userId, widget_id: widget.id, date, value: newDone ? 1 : 0 },
      { onConflict: 'user_id,widget_id,date' }
    )
  }

  if (loading) {
    return <div className="h-40 flex items-center justify-center" style={{ color: 'rgba(17,17,17,0.2)' }}>Loading…</div>
  }

  // ── Not started ──────────────────────────────────────────────────────────
  if (!startDate) {
    return (
      <div className="space-y-4 pb-2">
        <div
          className="rounded-2xl p-8 flex flex-col items-center gap-4"
          style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}
        >
          <span className="text-5xl">{widget.icon}</span>
          <div className="text-center">
            <h3 className="text-lg font-medium" style={{ color: 'var(--text)' }}>{widget.label}</h3>
            <p className="text-sm mt-1" style={{ color: 'rgba(17,17,17,0.4)' }}>
              {totalDays} days · Starting today locks you in
            </p>
          </div>
          <button
            onClick={startChallenge}
            className="px-6 py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
            style={{ background: '#111', color: '#fff' }}
          >
            Start challenge
          </button>
        </div>
      </div>
    )
  }

  // ── In progress / complete ───────────────────────────────────────────────
  const currentDay = Math.min(daysBetween(startDate, today) + 1, totalDays)
  const isComplete = currentDay > totalDays
  const dayGrid = getDayGrid(startDate, totalDays)
  const completedCount = dayGrid.filter((d) => checkedDates[d]).length
  const pct = completedCount / totalDays
  const daysRemaining = Math.max(0, totalDays - currentDay + 1)

  // Streak from today backward
  let streak = 0
  for (let i = 0; i < currentDay; i++) {
    const d = dayGrid[currentDay - 1 - i]
    if (!d) break
    if (d === today && !checkedDates[d]) continue  // today not yet checked
    if (checkedDates[d]) streak++
    else break
  }

  const todayChecked = checkedDates[today] ?? false
  const todayInChallenge = today >= startDate && today <= dayGrid[dayGrid.length - 1]

  // Cols for the grid
  const cols = totalDays <= 21 ? 7 : totalDays <= 30 ? 10 : 10

  return (
    <div className="space-y-5 pb-2">
      {/* Progress ring + day counter */}
      <div
        className="rounded-2xl p-6 flex items-center gap-6"
        style={{
          background: 'rgba(0,0,0,0.03)',
          border: `1px solid ${isComplete ? 'rgba(34,197,94,0.2)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <div className="relative shrink-0">
          <ProgressRing pct={pct} color={isComplete ? 'var(--success)' : accentColor} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-medium tabular-nums" style={{ color: accentColor }}>
              {completedCount}
            </span>
            <span className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(17,17,17,0.35)' }}>
              / {totalDays}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <p className="text-xl font-medium" style={{ color: 'var(--text)' }}>
              {isComplete ? 'Complete 🎉' : `Day ${currentDay}`}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(17,17,17,0.4)' }}>
              {isComplete ? `${completedCount} of ${totalDays} days checked in` : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`}
            </p>
          </div>
          {streak > 1 && (
            <p className="text-xs" style={{ color: accentColor }}>
              🔥 {streak}-day streak
            </p>
          )}
        </div>
      </div>

      {/* Daily check-in */}
      {todayInChallenge && (
        <button
          onClick={() => toggleDay(today)}
          className="w-full rounded-2xl flex items-center justify-center gap-3 py-4 transition-all active:scale-[0.98]"
          style={{
            background: todayChecked ? `${accentColor}15` : 'rgba(0,0,0,0.03)',
            border: todayChecked ? `1.5px solid ${accentColor}40` : '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{ background: todayChecked ? accentColor : 'rgba(0,0,0,0.08)' }}
          >
            {todayChecked && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 6l3 3 5-5" />
              </svg>
            )}
          </div>
          <span className="text-sm font-medium" style={{ color: todayChecked ? accentColor : 'rgba(17,17,17,0.5)' }}>
            {todayChecked ? 'Day complete' : 'Check in today'}
          </span>
        </button>
      )}

      {/* Day grid */}
      <div>
        <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'rgba(17,17,17,0.3)' }}>
          {totalDays}-day map
        </p>
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {dayGrid.map((date, i) => {
            const isPast = date < today
            const isT = date === today
            const isFuture = date > today
            const done = checkedDates[date]
            const dayNum = i + 1

            let bg = 'rgba(0,0,0,0.06)'
            if (done) bg = isT ? accentColor : `${accentColor}99`
            else if (isPast) bg = 'rgba(239,68,68,0.2)'  // missed

            return (
              <button
                key={date}
                onClick={() => toggleDay(date)}
                disabled={isFuture}
                className="aspect-square rounded flex items-center justify-center transition-all active:scale-95 disabled:cursor-default"
                style={{ background: bg }}
                title={`Day ${dayNum} — ${date}`}
              >
                {isT && !done && (
                  <span className="text-[8px] font-bold" style={{ color: 'rgba(17,17,17,0.4)' }}>
                    {dayNum}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <div className="flex gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ background: `${accentColor}99` }} />
            <span className="text-[8px]" style={{ color: 'rgba(17,17,17,0.35)' }}>Done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ background: 'rgba(239,68,68,0.25)' }} />
            <span className="text-[8px]" style={{ color: 'rgba(17,17,17,0.35)' }}>Missed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ background: 'rgba(0,0,0,0.06)' }} />
            <span className="text-[8px]" style={{ color: 'rgba(17,17,17,0.35)' }}>Upcoming</span>
          </div>
        </div>
      </div>
    </div>
  )
}
