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

  // Fetch last 14 days of widget logs for charts + today's value
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 14)
  const cutoff = cutoffDate.toISOString().split('T')[0]

  const [messagesRes, todayLogsRes, zynLogRes, widgetLogsRes] = await Promise.all([
    supabase
      .from('messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),

    supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', new Date().toISOString().split('T')[0]),

    supabase
      .from('zyn_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', new Date().toISOString().split('T')[0])
      .single(),

    supabase
      .from('widget_logs')
      .select('widget_id, date, value')
      .eq('user_id', user.id)
      .gte('date', cutoff)
      .order('date', { ascending: true }),
  ])

  // Group widget logs by widget_id
  const widgetLogs: Record<string, { date: string; value: number }[]> = {}
  for (const row of widgetLogsRes.data ?? []) {
    if (!widgetLogs[row.widget_id]) widgetLogs[row.widget_id] = []
    widgetLogs[row.widget_id].push({ date: row.date, value: Number(row.value) })
  }

  return (
    <Suspense>
      <DashboardShell
        userId={user.id}
        dashboard={dashboard}
        initialMessages={messagesRes.data ?? []}
        todayLogs={todayLogsRes.data ?? []}
        zynLog={zynLogRes.data ?? null}
        widgetLogs={widgetLogs}
      />
    </Suspense>
  )
}
