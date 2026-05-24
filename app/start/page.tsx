import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingShell from '@/components/chat/OnboardingShell'

export default async function StartPreview() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  return (
    <div className="fixed inset-0">
      <OnboardingShell userId={user.id} initialMessages={messages ?? []} />
    </div>
  )
}
