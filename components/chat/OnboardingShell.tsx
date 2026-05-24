'use client'

import { useState, useRef } from 'react'
import { Message } from '@/lib/types'

interface OnboardingShellProps {
  userId: string
  initialMessages: Message[]
}

export default function OnboardingShell({ userId, initialMessages }: OnboardingShellProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed) return
    sessionStorage.setItem('onboarding_message', trimmed)
    router.push('/chat')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleInput() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`
  }

  return (
    <div
      className="flex flex-col items-center justify-center h-full px-6"
      style={{ paddingBottom: '10vh' }}
    >
      <div className="w-full" style={{ maxWidth: '680px' }}>
        <h1
          className="text-3xl mb-4"
          style={{ color: 'var(--text)', fontWeight: 400, letterSpacing: '-0.02em' }}
        >
          What do you want to get done?
        </h1>

        {/* Large input card */}
        <div
          className="flex flex-col rounded-2xl p-3"
          style={{
            background: 'rgba(0,0,0,0.04)',
            border: '1px solid rgba(0,0,0,0.1)',
          }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Tell me about your goals..."
            rows={5}
            className="w-full resize-none bg-transparent text-sm outline-none"
            style={{
              color: '#111',
              fontFamily: 'inherit',
              lineHeight: '1.6',
              minHeight: '120px',
            }}
          />

          {/* Bottom row */}
          <div className="flex items-center justify-end gap-3 mt-2">
            {/* Mic icon */}
            <button
              className="opacity-25"
              style={{ color: '#111' }}
              tabIndex={-1}
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="1" width="6" height="10" rx="3" />
                <path d="M3 9a6 6 0 0 0 12 0" />
                <line x1="9" y1="15" x2="9" y2="17" />
                <line x1="6" y1="17" x2="12" y2="17" />
              </svg>
            </button>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!value.trim()}
              className="px-5 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-30 active:scale-95"
              style={{ background: '#111', color: '#fff', whiteSpace: 'nowrap' }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
