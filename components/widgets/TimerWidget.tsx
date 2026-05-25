'use client'

// TimerWidget — live countdown/elapsed timer stored in DB.
// Examples: 72-hour fast, 24-hour water-only, sobriety counter, sleep tracking
//
// Start timestamp stored in widget_metadata. Updates every second.

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrackerWidget } from '@/lib/types'

interface TimerWidgetProps {
  widget: TrackerWidget
  userId: string
  accentColor?: string
}

function formatElapsed(ms: number): { hours: string; minutes: string; seconds: string } {
  const totalSecs = Math.floor(ms / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  return {
    hours: String(h).padStart(2, '0'),
    minutes: String(m).padStart(2, '0'),
    seconds: String(s).padStart(2, '0'),
  }
}

function getMilestones(goalHours: number): number[] {
  if (goalHours <= 24) return [goalHours * 0.25, goalHours * 0.5, goalHours * 0.75, goalHours].map(Math.round)
  if (goalHours <= 72) return [12, 24, 48, goalHours]
  return [24, 48, 72, goalHours]
}

export default function TimerWidget({
  widget,
  userId,
  accentColor = '#ff7820',
}: TimerWidgetProps) {
  const supabase = createClient()
  const goalHours = widget.timerGoalHours ?? widget.goal ?? 72
  const goalMs = goalHours * 3600 * 1000
  const milestones = getMilestones(goalHours)

  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load persisted start time
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('widget_metadata')
        .select('value')
        .eq('user_id', userId)
        .eq('widget_id', widget.id)
        .eq('key', 'start_time')
        .single()

      if (data?.value) {
        const ts = parseInt(data.value)
        setStartTime(ts)
        setElapsed(Date.now() - ts)
      }
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Live tick
  useEffect(() => {
    if (startTime === null) return
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startTime)
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [startTime])

  async function handleStart() {
    const now = Date.now()
    await supabase.from('widget_metadata').upsert(
      { user_id: userId, widget_id: widget.id, key: 'start_time', value: String(now) },
      { onConflict: 'user_id,widget_id,key' }
    )
    setStartTime(now)
    setElapsed(0)
  }

  async function handleReset() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    await supabase.from('widget_metadata').upsert(
      { user_id: userId, widget_id: widget.id, key: 'start_time', value: '' },
      { onConflict: 'user_id,widget_id,key' }
    )
    setStartTime(null)
    setElapsed(0)
  }

  if (loading) {
    return <div className="h-40 flex items-center justify-center" style={{ color: 'rgba(17,17,17,0.2)' }}>Loading…</div>
  }

  const isComplete = elapsed >= goalMs
  const pct = Math.min(elapsed / goalMs, 1)
  const elapsedHours = elapsed / 3600000
  const { hours, minutes, seconds } = formatElapsed(elapsed)
  const running = startTime !== null

  return (
    <div className="space-y-4 pb-2">
      {/* Main timer display */}
      <div
        className="rounded-2xl p-6 flex flex-col items-center gap-3"
        style={{
          background: 'rgba(0,0,0,0.03)',
          border: `1px solid ${isComplete ? 'rgba(34,197,94,0.2)' : running ? `${accentColor}30` : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        {/* Status */}
        <div className="flex items-center gap-2">
          {running && !isComplete && (
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: accentColor }}
            />
          )}
          <span className="text-[10px] uppercase tracking-widest" style={{ color: isComplete ? 'var(--success)' : running ? accentColor : 'rgba(17,17,17,0.3)' }}>
            {isComplete ? 'Complete 🎉' : running ? 'Running' : 'Not started'}
          </span>
        </div>

        {/* Big time */}
        <div className="flex items-end gap-1 tabular-nums">
          <span style={{ fontSize: '64px', fontWeight: 500, lineHeight: 1, color: isComplete ? 'var(--success)' : 'var(--text)' }}>
            {hours}
          </span>
          <span style={{ fontSize: '32px', fontWeight: 300, lineHeight: 1.4, color: 'rgba(17,17,17,0.3)' }}>:</span>
          <span style={{ fontSize: '64px', fontWeight: 500, lineHeight: 1, color: isComplete ? 'var(--success)' : 'var(--text)' }}>
            {minutes}
          </span>
          <span style={{ fontSize: '32px', fontWeight: 300, lineHeight: 1.4, color: 'rgba(17,17,17,0.3)' }}>:</span>
          <span style={{ fontSize: '40px', fontWeight: 300, lineHeight: 1.2, color: 'rgba(17,17,17,0.4)' }}>
            {seconds}
          </span>
        </div>

        <p className="text-xs" style={{ color: 'rgba(17,17,17,0.35)' }}>
          {running ? `Goal: ${goalHours}h` : `${goalHours}-hour timer`}
        </p>

        {/* Progress bar */}
        {running && (
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${pct * 100}%`, background: isComplete ? 'var(--success)' : accentColor }}
            />
          </div>
        )}
      </div>

      {/* Start / Reset */}
      <div className="flex gap-2">
        {!running ? (
          <button
            onClick={handleStart}
            className="flex-1 py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
            style={{ background: '#111', color: '#fff' }}
          >
            Start timer
          </button>
        ) : (
          <button
            onClick={handleReset}
            className="flex-1 py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
            style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--text)', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Milestone markers */}
      <div>
        <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'rgba(17,17,17,0.3)' }}>
          Milestones
        </p>
        <div className="space-y-1.5">
          {milestones.map((h, i) => {
            const reached = elapsedHours >= h
            const isGoal = h === goalHours
            return (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs"
                style={{
                  background: reached ? `${accentColor}10` : 'rgba(0,0,0,0.03)',
                  border: reached ? `1px solid ${accentColor}30` : '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <span style={{ color: reached ? accentColor : 'rgba(17,17,17,0.5)' }}>
                  {h}h {isGoal ? '— Goal' : ''}
                </span>
                <span style={{ color: reached ? accentColor : 'rgba(17,17,17,0.25)' }}>
                  {reached ? '✓' : `${h}:00:00`}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
