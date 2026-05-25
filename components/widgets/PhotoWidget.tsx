'use client'

// PhotoWidget — daily progress photo log (weight loss, body transformation, etc.)
// Photos stored in Supabase Storage bucket 'progress-photos'.
// URLs stored in widget_logs.text_value.
//
// SETUP REQUIRED: Create a 'progress-photos' storage bucket in your Supabase
// project with RLS policies allowing authenticated users to read/write their own files.

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrackerWidget } from '@/lib/types'

interface PhotoWidgetProps {
  widget: TrackerWidget
  userId: string
  accentColor?: string
}

interface PhotoEntry {
  date: string
  url: string
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const BUCKET = 'progress-photos'

export default function PhotoWidget({
  widget,
  userId,
  accentColor = '#ff7820',
}: PhotoWidgetProps) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const fileRef = useRef<HTMLInputElement>(null)

  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<PhotoEntry | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('widget_logs')
        .select('date, text_value')
        .eq('user_id', userId)
        .eq('widget_id', widget.id)
        .not('text_value', 'is', null)
        .order('date', { ascending: false })
        .limit(30)

      const entries: PhotoEntry[] = (data ?? [])
        .filter((r) => r.text_value)
        .map((r) => ({ date: r.date, url: r.text_value! }))

      setPhotos(entries)
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpload(file: File) {
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    if (file.size > 10 * 1024 * 1024) { setError('File must be under 10MB'); return }

    setUploading(true)
    setError(null)

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${userId}/${widget.id}/${today}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError('Upload failed. Make sure the progress-photos storage bucket exists.')
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
    // Append cache-buster so re-uploads refresh immediately
    const url = `${urlData.publicUrl}?t=${Date.now()}`

    await supabase.from('widget_logs').upsert(
      { user_id: userId, widget_id: widget.id, date: today, value: 1, text_value: url },
      { onConflict: 'user_id,widget_id,date' }
    )

    const newEntry = { date: today, url }
    setPhotos((prev) => [newEntry, ...prev.filter((p) => p.date !== today)])
    setUploading(false)
  }

  const todayPhoto = photos.find((p) => p.date === today)
  const pastPhotos = photos.filter((p) => p.date !== today)

  if (loading) {
    return <div className="h-40 flex items-center justify-center" style={{ color: 'rgba(17,17,17,0.2)' }}>Loading…</div>
  }

  return (
    <div className="space-y-4 pb-2">
      {/* Today's photo */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
      />

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(0,0,0,0.03)',
          border: `1px solid ${todayPhoto ? 'rgba(34,197,94,0.2)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        {todayPhoto ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={todayPhoto.url}
              alt="Today's progress photo"
              className="w-full object-cover"
              style={{ maxHeight: '320px' }}
            />
            <div className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-center justify-between"
              style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.5))' }}>
              <span className="text-xs text-white font-medium">Today</span>
              <button
                onClick={() => fileRef.current?.click()}
                className="text-xs text-white opacity-70 hover:opacity-100 transition-opacity"
              >
                Retake
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex flex-col items-center gap-3 py-12 transition-all active:opacity-70"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: `${accentColor}15`, border: `1.5px dashed ${accentColor}50` }}
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: accentColor, borderTopColor: 'transparent' }} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={accentColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="18" height="14" rx="2" />
                  <circle cx="10" cy="11" r="3" />
                  <path d="M7 4l1.5-2h3L13 4" />
                </svg>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {uploading ? 'Uploading…' : 'Add today\'s photo'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(17,17,17,0.35)' }}>
                Tap to take or choose from library
              </p>
            </div>
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs px-1" style={{ color: 'var(--danger)' }}>{error}</p>
      )}

      {/* Photo timeline grid */}
      {pastPhotos.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'rgba(17,17,17,0.3)' }}>
            Progress timeline
          </p>
          <div className="grid grid-cols-3 gap-2">
            {pastPhotos.map((photo) => (
              <button
                key={photo.date}
                onClick={() => setSelected(photo)}
                className="aspect-square rounded-xl overflow-hidden relative transition-all active:scale-95"
                style={{ border: '1px solid rgba(0,0,0,0.06)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.date} className="w-full h-full object-cover" />
                <div
                  className="absolute bottom-0 left-0 right-0 px-1.5 py-1"
                  style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}
                >
                  <span className="text-[9px] text-white">{formatDate(photo.date)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setSelected(null)}
        >
          <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.url} alt={selected.date} className="w-full rounded-2xl object-contain" />
            <p className="text-center text-white text-sm mt-3 opacity-60">{formatDate(selected.date)}</p>
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.5)' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                <path d="M1 1l10 10M11 1l-10 10" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
