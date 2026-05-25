export type TrackerWidget = {
  id: string
  type: 'number' | 'checkbox' | 'scale' | 'duration' | 'challenge' | 'timer' | 'journal' | 'photo'
  label: string
  icon: string
  // number / duration
  unit?: string          // e.g. "lbs", "bottles", "min"
  goal?: number          // target value per day (or minutes for duration, hours for timer)
  step?: number          // increment for counter mode (default 1)
  display?: 'counter' | 'log'
  // scale
  min?: number           // default 1
  max?: number           // default 10
  // challenge
  challengeDays?: number // total days in challenge (e.g. 21)
  // timer
  timerGoalHours?: number // target hours (e.g. 72 for a 72-hr fast)
  // weekly frequency
  weeklyGoal?: number    // target completions per week (overrides daily goal)
}

export type DashboardConfig = {
  title: string
  subtitle?: string
  accentColor: string
  dailyTasks: {
    id: string
    label: string
    icon: string
    category: 'body' | 'mind' | 'custom'
    detail?: string
  }[]
  projects: {
    id: string
    label: string
    icon: string
    color: string
  }[]
  trackers: {
    zyn?: {
      enabled: boolean
      dailyGoal: number
      quitPlan: { label: string; target: string }[]
    }
    fitness?: {
      enabled: boolean
      metrics: string[]
    }
  }
  widgets?: TrackerWidget[]
  createdAt: string
}

export type Message = {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  dashboard_snapshot: DashboardConfig | null
  is_dashboard_version: boolean
  version_name: string | null
  created_at: string
}

export type Profile = {
  id: string
  onboarded: boolean
  goals_summary: string | null
  created_at: string
}

export type Dashboard = {
  id: string
  user_id: string
  name: string
  config: DashboardConfig
  promoted_from_message_id: string | null
  created_at: string
  updated_at: string
}
