import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import DashboardShell from '@/components/dashboard/DashboardShell'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: dashboard } = await supabase
    .from('dashboards')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (!dashboard) redirect('/chat')

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const { data: todayLogs } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', new Date().toISOString().split('T')[0])

  const { data: zynLog } = await supabase
    .from('zyn_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', new Date().toISOString().split('T')[0])
    .single()

  return (
    <Suspense>
      <DashboardShell
        userId={user.id}
        dashboard={dashboard}
        initialMessages={messages ?? []}
        todayLogs={todayLogs ?? []}
        zynLog={zynLog ?? null}
      />
    </Suspense>
  )
}
