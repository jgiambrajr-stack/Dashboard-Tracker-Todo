'use client'

// NumberWidget — two interaction modes:
//   counter: +/- buttons (water bottles, push-ups, coffees, steps)
//   log:     direct input with yesterday context (weight, sleep hours, calories, miles)
//
// Mode is set by widget.display, or inferred: step < 1 → log, step >= 1 without a small goal → counter

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrackerWidget } from '@/lib/types'
import BarChart from './BarChart'
import LineChart from './LineChart'

interface NumberWidgetProps {
  widget: TrackerWidget
  userId: string
  todayValue: number | null
  history: { date: string; value: number }[]
  accentColor?: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function inferMode(widget: TrackerWidget): 'counter' | 'log' {
  if (widget.display) return widget.display
  // Fractional step → log (weight 0.1, sleep 0.5, etc.)
  if ((widget.step ?? 1) < 1) return 'log'
  // Large goal → log (calories 2000, steps 10000)
  if (widget.goal && widget.goal > 50) return 'log'
  return 'counter'
}

function fmt(value: number, step: number): string {
  if (step < 1) return value.toFixed(1)
  if (step >= 100) return value.toLocaleString()
  return String(Math.round(value))
}

function calcStreak(history: { date: string; value: number }[], goal?: number, today = ''): number {
  const byDate: Record<string, number> = {}
  history.forEach((h) => { byDate[h.date] = h.value })
  let streak = 0
  for (let i = 0; i <= 60; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    const val = byDate[ds] ?? 0
    if (ds === today && val === 0) continue
    const met = goal !== undefined ? val >= goal : val > 0
    if (met) streak++; else break
  }
  return streak
}

function calcAvg(history: { date: string; value: number }[], days = 14): number {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const recent = history.filter((h) => new Date(h.date + 'T00:00') >= cutoff && h.value > 0)
  if (!recent.length) return 0
  return recent.reduce((s, h) => s + h.value, 0) / recent.length
}

function getYesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

// ─── Stat card ─────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      className="rounded-xl p-3 flex flex-col items-center justify-center text-center"
      style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}
    >
      <span className="text-2xl font-medium tabular-nums leading-none" style={{ color: accent }}>
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-widest mt-1.5" style={{ color: 'rgba(17,17,17,0.35)' }}>
        {label}
      </span>
    </div>
  )
}

// ─── Log mode — direct input with context ──────────────────────────────────

function LogMode({
  widget, userId, value, history, accentColor, today, onPersist,
}: {
  widget: TrackerWidget
  userId: string
  value: number
  history: { date: string; value: number }[]
  accentColor: string
  today: string
  onPersist: (v: number) => Promise<void>
}) {
  const step = widget.step ?? 1
  const [inputStr, setInputStr] = useState(value > 0 ? fmt(value, step) : '')
  const [saved, setSaved] = useState(value > 0)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const yesterdayVal = history.find((h) => h.date === getYesterday())?.value
  const avg = calcAvg(history)

  const parsed = parseFloat(inputStr)
  const isValid = !isNaN(parsed) && parsed > 0

  // Delta vs yesterday
  const delta = (isValid && yesterdayVal) ? parsed - yesterdayVal : null
  const deltaStr = delta !== null
    ? `${delta > 0 ? '+' : ''}${fmt(Math.abs(delta), step)} vs yesterday`
    : null
  const deltaColor = delta === null ? '' : delta === 0 ? 'rgba(17,17,17,0.4)' : delta > 0 ? 'var(--danger)' : 'var(--success)'

  async function handleLog() {
    if (!isValid) return
    setSaving(true)
    await onPersist(parsed)
    setSaved(true)
    setSaving(false)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleLog()
  }

  return (
    <div className="space-y-4">
      {/* Input card */}
      <div
        className="rounded-2xl p-6 flex flex-col items-center gap-3"
        style={{
          background: 'rgba(0,0,0,0.03)',
          border: `1px solid ${saved ? 'rgba(34,197,94,0.25)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(17,17,17,0.3)' }}>
          Today&apos;s {widget.label.toLowerCase()}
        </p>

        {/* Big number input */}
        <div className="flex items-baseline gap-2">
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            value={inputStr}
            onChange={(e) => { setInputStr(e.target.value); setSaved(false) }}
            onKeyDown={handleKey}
            placeholder={yesterdayVal ? fmt(yesterdayVal, step) : '—'}
            className="bg-transparent outline-none tabular-nums text-center w-40"
            style={{
              fontSize: '64px',
              fontWeight: 500,
              color: saved ? 'var(--success)' : 'var(--text)',
              fontFamily: 'inherit',
              lineHeight: 1,
            }}
          />
          {widget.unit && (
            <span className="text-lg" style={{ color: 'rgba(17,17,17,0.3)', paddingBottom: '6px' }}>
              {widget.unit}
            </span>
          )}
        </div>

        {/* Delta vs yesterday */}
        {deltaStr && (
          <span className="text-xs" style={{ color: deltaColor }}>
            {deltaStr}
          </span>
        )}

        {/* Yesterday context */}
        {yesterdayVal !== undefined && !deltaStr && (
          <span className="text-xs" style={{ color: 'rgba(17,17,17,0.35)' }}>
            Yesterday: {fmt(yesterdayVal, step)} {widget.unit}
          </span>
        )}

        {/* Log button */}
        <button
          onClick={handleLog}
          disabled={!isValid || saving}
          className="mt-1 px-6 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-30"
          style={{
            background: saved ? 'rgba(34,197,94,0.12)' : '#111',
            color: saved ? 'var(--success)' : '#fff',
            border: saved ? '1px solid rgba(34,197,94,0.3)' : 'none',
          }}
        >
          {saving ? 'Saving…' : saved ? 'Logged ✓' : `Log ${widget.unit ?? 'value'}`}
        </button>
      </div>

      {/* Context row */}
      {avg > 0 && (
        <div
          className="rounded-xl px-4 py-3 flex justify-between items-center"
          style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}
        >
          <span className="text-xs" style={{ color: 'rgba(17,17,17,0.4)' }}>14-day average</span>
          <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--text)' }}>
            {fmt(avg, step)} {widget.unit}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Counter mode — +/- increment buttons ──────────────────────────────────

function CounterMode({
  widget, value, accentColor, onPersist,
}: {
  widget: TrackerWidget
  value: number
  accentColor: string
  onPersist: (v: number) => Promise<void>
}) {
  const step = widget.step ?? 1
  const atGoal = widget.goal !== undefined && value >= widget.goal
  const overGoal = widget.goal !== undefined && value > widget.goal
  const pct = widget.goal ? Math.min((value / widget.goal) * 100, 100) : 0

  return (
    <div className="space-y-3">
      {/* Big counter card */}
      <div
        className="rounded-2xl p-6 flex flex-col items-center gap-3"
        style={{
          background: 'rgba(0,0,0,0.03)',
          border: `1px solid ${atGoal ? 'rgba(34,197,94,0.2)' : overGoal ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <div
          className="text-8xl font-medium tabular-nums leading-none"
          style={{ color: atGoal ? 'var(--success)' : overGoal ? 'var(--danger)' : 'var(--text)' }}
        >
          {fmt(value, step)}
        </div>

        {/* Progress bar toward goal */}
        {widget.goal !== undefined && (
          <>
            <div className="w-full max-w-[200px] h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: atGoal ? 'var(--success)' : accentColor }}
              />
            </div>
            <span className="text-xs" style={{ color: atGoal ? 'var(--success)' : 'rgba(17,17,17,0.4)' }}>
              {atGoal ? `Goal reached ✓` : `${fmt(widget.goal - value, step)} ${widget.unit ?? ''} to go`.trim()}
            </span>
          </>
        )}

        {widget.unit && !widget.goal && (
          <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(17,17,17,0.3)' }}>
            {widget.unit} today
          </span>
        )}
      </div>

      {/* +/− */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => onPersist(value - step)}
          disabled={value <= 0}
          className="w-16 h-16 rounded-2xl text-3xl font-light flex items-center justify-center transition-all active:scale-95 disabled:opacity-20"
          style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#111' }}
        >
          −
        </button>
        <div className="text-[10px] uppercase tracking-widest text-center" style={{ color: 'rgba(17,17,17,0.3)' }}>
          {widget.unit ?? 'count'}
        </div>
        <button
          onClick={() => onPersist(value + step)}
          className="w-16 h-16 rounded-2xl text-3xl font-light flex items-center justify-center transition-all active:scale-95"
          style={{ background: '#111', color: '#fff' }}
        >
          +
        </button>
      </div>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

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
  const mode = inferMode(widget)

  const [value, setValue] = useState<number>(todayValue ?? 0)
  const streak = calcStreak([...history.filter(h => h.date !== today), { date: today, value }], widget.goal, today)
  const avg = calcAvg(history)
  const chartHistory = [...history.filter(h => h.date !== today), ...(value > 0 ? [{ date: today, value }] : [])]

  const persist = useCallback(async (newVal: number) => {
    const clamped = Math.max(0, newVal)
    setValue(clamped)
    await supabase.from('widget_logs').upsert(
      { user_id: userId, widget_id: widget.id, date: today, value: clamped },
      { onConflict: 'user_id,widget_id,date' }
    )
  }, [supabase, userId, widget.id, today])

  return (
    <div className="space-y-4 pb-2">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label={widget.goal ? 'Daily Goal' : 'Streak'}
          value={widget.goal ? fmt(widget.goal, step) : (streak > 0 ? String(streak) : '—')}
          accent={accentColor}
        />
        <StatCard
          label="Day Streak"
          value={streak > 0 ? String(streak) : '—'}
          accent={accentColor}
        />
        <StatCard
          label="14-Day Avg"
          value={avg > 0 ? fmt(avg, step) : '—'}
          accent={accentColor}
        />
      </div>

      {/* Interaction — mode-dependent */}
      {mode === 'log' ? (
        <LogMode
          widget={widget}
          userId={userId}
          value={value}
          history={history}
          accentColor={accentColor}
          today={today}
          onPersist={async (v) => { setValue(v); await persist(v) }}
        />
      ) : (
        <CounterMode
          widget={widget}
          value={value}
          accentColor={accentColor}
          onPersist={persist}
        />
      )}

      {/* Chart — line for log mode, bar for counter */}
      <div>
        <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'rgba(17,17,17,0.3)' }}>
          Last 14 days
        </p>
        {mode === 'log' ? (
          <LineChart data={chartHistory} goal={widget.goal} color={accentColor} />
        ) : (
          <BarChart data={chartHistory} goal={widget.goal} color={accentColor} />
        )}
      </div>
    </div>
  )
}
