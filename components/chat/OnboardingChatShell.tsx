'use client'

import { useState, useEffect } from 'react'
import { Message } from '@/lib/types'
import ChatThread from './ChatThread'

interface OnboardingChatShellProps {
  userId: string
  initialMessages: Message[]
}

export default function OnboardingChatShell({ userId, initialMessages }: OnboardingChatShellProps) {
  const [autoSendMessage, setAutoSendMessage] = useState<string | null>(null)

  useEffect(() => {
    const msg = sessionStorage.getItem('onboarding_message')
    if (msg) {
      sessionStorage.removeItem('onboarding_message')
      setAutoSendMessage(msg)
    }
  }, [])

  return (
    <ChatThread
      initialMessages={initialMessages}
      userId={userId}
      isOnboarding={true}
      isFullPage={true}
      autoSendMessage={autoSendMessage}
      onAutoSendConsumed={() => setAutoSendMessage(null)}
    />
  )
}
