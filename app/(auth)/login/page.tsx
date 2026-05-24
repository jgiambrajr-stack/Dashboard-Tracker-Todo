'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-full flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <h1
            className="text-3xl font-medium tracking-tight"
            style={{ color: 'var(--text)' }}
          >
            Get Access
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Enter your email for your personal dashboard
          </p>
        </div>

        {sent ? (
          <div
            className="rounded-2xl p-4 text-sm"
            style={{
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid var(--border)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <p style={{ color: 'var(--text)' }}>Check your email for a login link.</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Sent to {email}</p>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-3">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.7)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                backdropFilter: 'blur(12px)',
                fontFamily: 'inherit',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(0,0,0,0.25)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />

            {error && (
              <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-3 rounded-xl text-sm font-medium transition-opacity disabled:opacity-20"
              style={{ background: '#111', color: '#fff' }}
            >
              {loading ? 'Sending...' : 'Send login link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
