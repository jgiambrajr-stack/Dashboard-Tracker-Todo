'use client'

import { useState, useRef, KeyboardEvent } from 'react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function ChatInput({ onSend, disabled, placeholder = 'Message...' }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function handleInput() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2"
      style={{
        background: 'rgba(0,0,0,0.04)',
        border: '1px solid rgba(0,0,0,0.07)',
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={placeholder}
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none bg-transparent text-sm outline-none disabled:opacity-40"
        style={{
          color: '#111',
          fontFamily: 'inherit',
          lineHeight: '1.5',
          maxHeight: '160px',
        }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-30 active:scale-95"
        style={{
          background: '#111',
          color: '#fff',
          whiteSpace: 'nowrap',
        }}
      >
        Send
      </button>
    </div>
  )
}
