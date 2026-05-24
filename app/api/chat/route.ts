import { createClient } from '@/lib/supabase/server'
import { anthropic, SYSTEM_PROMPT, parseDashboardFromResponse, stripDashboardBlock } from '@/lib/anthropic'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { message } = await request.json()

  // Load last 30 messages
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(30)

  // Load current dashboard if exists
  const { data: dashboard } = await supabase
    .from('dashboards')
    .select('config')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  // Save user message
  await supabase.from('messages').insert({
    user_id: user.id,
    role: 'user',
    content: message,
  })

  const systemPrompt = dashboard?.config
    ? `${SYSTEM_PROMPT}\n\n## Current Dashboard Config\n\`\`\`json\n${JSON.stringify(dashboard.config, null, 2)}\n\`\`\``
    : SYSTEM_PROMPT

  const messages = [
    ...(history ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ]

  // Stream response
  const encoder = new TextEncoder()
  let fullText = ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-5',
          max_tokens: 4096,
          system: systemPrompt,
          messages,
        })

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            fullText += chunk.delta.text
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }

        // Parse and save assistant message
        const dashboardSnapshot = parseDashboardFromResponse(fullText)
        const cleanContent = stripDashboardBlock(fullText)

        await supabase.from('messages').insert({
          user_id: user.id,
          role: 'assistant',
          content: cleanContent,
          dashboard_snapshot: dashboardSnapshot,
          is_dashboard_version: !!dashboardSnapshot,
          version_name: dashboardSnapshot?.title ?? null,
        })

        controller.close()
      } catch (err) {
        console.error('Stream error:', err)
        controller.error(err)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
