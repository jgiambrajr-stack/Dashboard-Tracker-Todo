import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChatThread from '@/components/chat/ChatThread'
import OnboardingShell from '@/components/chat/OnboardingShell'

export default async function ChatPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    await supabase.from('profiles').insert({ id: user.id })
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const isOnboarding = !profile?.onboarded

  if (isOnboarding) {
    return (
      <div className="fixed inset-0">
        <OnboardingShell userId={user.id} initialMessages={messages ?? []} />
      </div>
    )
  }

  return (
    <div className="fixed inset-0">
      {/* Card — margins on top and sides, fills to bottom */}
      <div
        className="absolute flex flex-col overflow-hidden"
        style={{
          top: '36px',
          left: '36px',
          right: '36px',
          bottom: '20px',
          background: 'rgba(0,0,0,0.03)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '1.25rem',
        }}
      >
        <ChatThread
          initialMessages={messages ?? []}
          userId={user.id}
          isOnboarding={false}
          isFullPage={true}
        />
      </div>
    </div>
  )
}
