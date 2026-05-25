'use client'

import { useState } from 'react'
import { DashboardConfig, TrackerWidget } from '@/lib/types'
import TodayModule from './TodayModule'
import ZynModule from './ZynModule'
import ProjectsModule from './ProjectsModule'
import WidgetRenderer from '@/components/widgets/WidgetRenderer'

interface DashboardRendererProps {
  config: DashboardConfig
  userId: string
  todayLogs: { task_id: string; completed: boolean; date: string }[]
  zynLog: { count: number; goal: number; date: string } | null
  widgetLogs: Record<string, { date: string; value: number }[]>
  createdAt: string
}

type Tab = { id: string; label: string; widget?: TrackerWidget }

function buildTabs(config: DashboardConfig): Tab[] {
  const tabs: Tab[] = [{ id: 'today', label: 'Today' }]
  if (config.trackers?.zyn?.enabled) tabs.push({ id: 'zyn', label: 'Zyn' })
  if (config.projects?.length > 0) tabs.push({ id: 'projects', label: 'Projects' })
  config.widgets?.forEach((w) => {
    tabs.push({ id: `widget_${w.id}`, label: w.label, widget: w })
  })
  return tabs
}

export default function DashboardRenderer({
  config,
  userId,
  todayLogs,
  zynLog,
  widgetLogs,
  createdAt,
}: DashboardRendererProps) {
  const tabs = buildTabs(config)
  const [activeTab, setActiveTab] = useState(tabs[0].id)

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const dayNumber = Math.max(
    1,
    Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
  )

  const activeWidget = tabs.find((t) => t.id === activeTab)?.widget

  return (
    <div className="flex flex-col min-h-full">
      <div className="w-full mx-auto flex flex-col min-h-full" style={{ maxWidth: '1080px' }}>
        {/* Header */}
        <div className="px-5 pt-7 pb-5">
          {config.subtitle && (
            <p
              className="text-xs uppercase tracking-widest mb-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              {config.subtitle}
            </p>
          )}
          <h1
            className="text-5xl font-normal leading-tight tracking-tight"
            style={{ color: 'var(--text)' }}
          >
            Lock In — Day {dayNumber}
          </h1>
          <p className="text-sm font-bold mt-2" style={{ color: 'var(--text)' }}>
            {dateStr}
          </p>
        </div>

        {/* Tab bar */}
        {tabs.length > 1 && (
          <div
            className="flex shrink-0 mx-5 overflow-x-auto"
            style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative px-4 py-3 text-sm transition-colors mr-2 shrink-0 flex items-center gap-1.5"
                style={{
                  color: activeTab === tab.id ? 'var(--text)' : 'rgba(0,0,0,0.35)',
                  fontWeight: activeTab === tab.id ? 500 : 400,
                }}
              >
                {tab.widget && <span>{tab.widget.icon}</span>}
                {tab.label}
                {activeTab === tab.id && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: '#111' }}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-5">
          {activeTab === 'today' && (
            <TodayModule config={config} userId={userId} initialLogs={todayLogs} />
          )}
          {activeTab === 'zyn' && config.trackers?.zyn && (
            <ZynModule userId={userId} zynConfig={config.trackers.zyn} initialLog={zynLog} />
          )}
          {activeTab === 'projects' && (
            <ProjectsModule config={config} userId={userId} />
          )}
          {activeWidget && (
            <WidgetRenderer
              widget={activeWidget}
              userId={userId}
              todayValue={widgetLogs[activeWidget.id]?.find(
                (l) => l.date === new Date().toISOString().split('T')[0]
              )?.value ?? null}
              history={widgetLogs[activeWidget.id] ?? []}
              accentColor={config.accentColor}
            />
          )}
        </div>
      </div>
    </div>
  )
}
