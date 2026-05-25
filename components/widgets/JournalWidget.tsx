'use client'

// JournalWidget — free-text daily entry with recent history.
// Examples: gratitude log, daily reflection, workout notes, mood journal
//
// Entries stored in widget_logs.text_value (one per day).

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrackerWidget } from '@/lib/types'

interface JournalWidgetProps {
  widget: TrackerWidget
  userId: string
  accentColor?: string
}

interface JournalEntry {
  date: string
  text: string
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function JournalWidget({
  widget,
  userId,
  accentColor = '#ff7820',
}: JournalWidgetProps) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const [todayText, setTodayText] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('widget_logs')
        .select('date, text_value')
        .eq('user_id', userId)
        .eq('widget_id', widget.id)
        .not('text_value', 'is', null)
        .order('date', { ascending: false })
        .limit(10)

      const all: JournalEntry[] = (data ?? [])
        .filter((r) => r.text_value)
        .map((r) => ({ date: r.date, text: r.text_value! }))

      const todayEntry = all.find((e) => e.date === today)
      if (todayEntry) {
        setTodayText(todayEntry.text)
        setSaved(true)
      }

      setEntries(all.filter((e) => e.date !== today))
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!todayText.trim()) return
    setSaving(true)
    await supabase.from('widget_logs').upsert(
      {
        user_id: userId,
        widget_id: widget.id,
        date: today,
        value: 1,
        text_value: todayText.trim(),
      },
      { onConflict: 'user_id,widget_id,date' }
    )
    setSaved(true)
    setSaving(false)
  }

  if (loading) {
    return <div className="h-40 flex items-center justify-center" style={{ color: 'rgba(17,17,17,0.2)' }}>Loading…</div>
  }

  const charLimit = 500
  const remaining = charLimit - todayText.length

  return (
    <div className="space-y-4 pb-2">
      {/* Today's entry */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(0,0,0,0.03)',
          border: `1px solid ${saved && todayText ? 'rgba(34,197,94,0.2)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(17,17,17,0.35)' }}>
            Today&apos;s entry
          </span>
          {saved && todayText && (
            <span className="text-[10px]" style={{ color: 'var(--success)' }}>Saved ✓</span>
          )}
        </div>

        <textarea
          value={todayText}
          onChange={(e) => { setTodayText(e.target.value.slice(0, charLimit)); setSaved(false) }}
          placeholder={widget.label.toLowerCase().includes('gratitude')
            ? "What are you grateful for today?"
            : widget.label.toLowerCase().includes('reflect')
              ? "How did today go?"
              : "Write your entry for today…"}
          rows={4}
          className="w-full px-4 pb-3 bg-transparent outline-none resize-none text-sm leading-relaxed"
          style={{ color: 'var(--text)', fontFamily: 'inherit' }}
        />

        <div className="px-4 pb-3 flex items-center justify-between">
          <span className="text-[10px]" style={{ color: remaining < 50 ? 'var(--danger)' : 'rgba(17,17,17,0.2)' }}>
            {remaining < 100 ? `${remaining} left` : ''}
          </span>
          <button
            onClick={handleSave}
            disabled={!todayText.trim() || saving}
            className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 disabled:opacity-30"
            style={{
              background: saved ? 'rgba(34,197,94,0.12)' : '#111',
              color: saved ? 'var(--success)' : '#fff',
              border: saved ? '1px solid rgba(34,197,94,0.3)' : 'none',
            }}
          >
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save entry'}
          </button>
        </div>
      </div>

      {/* Past entries */}
      {entries.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'rgba(17,17,17,0.3)' }}>
            Previous entries
          </p>
          <div className="space-y-2">
            {entries.map((entry) => {
              const isOpen = expanded === entry.date
              const preview = entry.text.length > 80 ? entry.text.slice(0, 80) + '…' : entry.text

              return (
                <button
                  key={entry.date}
                  onClick={() => setExpanded(isOpen ? null : entry.date)}
                  className="w-full text-left rounded-xl px-4 py-3 transition-all"
                  style={{
                    background: isOpen ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.03)',
                    border: '1px solid rgba(0,0,0,0.06)',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: 'rgba(17,17,17,0.5)' }}>
                      {formatDate(entry.date)}
                    </span>
                    <span className="text-[10px]" style={{ color: 'rgba(17,17,17,0.25)' }}>
                      {isOpen ? '↑' : '↓'}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: isOpen ? 'var(--text)' : 'rgba(17,17,17,0.55)' }}>
                    {isOpen ? entry.text : preview}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {entries.length === 0 && !todayText && (
        <p className="text-xs text-center py-4" style={{ color: 'rgba(17,17,17,0.25)' }}>
          Your entries will appear here
        </p>
      )}
    </div>
  )
}
