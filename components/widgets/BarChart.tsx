'use client'

// Pure SVG bar chart — no external dependencies.
// Renders last N days as vertical bars with an optional goal line.

interface DayData {
  date: string   // YYYY-MM-DD
  value: number
}

interface BarChartProps {
  data: DayData[]        // sorted oldest → newest
  goal?: number
  color?: string         // bar fill color
  days?: number          // how many days to show (default 14)
}

function getLastNDates(n: number): string[] {
  const dates: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0]
}

export default function BarChart({
  data,
  goal,
  color = '#ff7820',
  days = 14,
}: BarChartProps) {
  const dates = getLastNDates(days)
  const byDate = Object.fromEntries(data.map((d) => [d.date, d.value]))

  const values = dates.map((d) => byDate[d] ?? 0)
  const maxVal = Math.max(goal ?? 0, ...values, 1)

  // SVG layout
  const W = 280
  const H = 72
  const labelH = 14
  const chartH = H - labelH
  const barW = 14
  const gapW = (W - days * barW) / (days - 1)
  const barR = 3

  function barX(i: number) {
    return i * (barW + gapW)
  }

  function barHeight(v: number) {
    return Math.max((v / maxVal) * chartH, v > 0 ? barR * 2 : 0)
  }

  function barY(v: number) {
    return chartH - barHeight(v)
  }

  const goalY = goal ? chartH - (goal / maxVal) * chartH : null

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Goal line */}
      {goalY !== null && (
        <>
          <line
            x1={0}
            y1={goalY}
            x2={W}
            y2={goalY}
            stroke="rgba(0,0,0,0.15)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <text
            x={W - 1}
            y={goalY - 3}
            textAnchor="end"
            fill="rgba(0,0,0,0.3)"
            fontSize="7"
            fontFamily="Inter, -apple-system, sans-serif"
          >
            goal: {goal}
          </text>
        </>
      )}

      {/* Bars */}
      {dates.map((date, i) => {
        const v = byDate[date] ?? 0
        const h = barHeight(v)
        const x = barX(i)
        const y = barY(v)
        const today = isToday(date)
        const overGoal = goal && v > goal
        const fill = v === 0
          ? 'rgba(0,0,0,0.06)'
          : overGoal
            ? 'rgba(239,68,68,0.6)'
            : today
              ? color
              : `${color}99`

        return (
          <g key={date}>
            <rect
              x={x}
              y={v === 0 ? chartH - 2 : y}
              width={barW}
              height={v === 0 ? 2 : h}
              rx={barR}
              fill={fill}
            />
          </g>
        )
      })}

      {/* Day labels — only show Mon/Thu or today to avoid clutter */}
      {dates.map((date, i) => {
        const today = isToday(date)
        if (!today && i % 7 !== 0 && i !== 0) return null
        return (
          <text
            key={`label-${date}`}
            x={barX(i) + barW / 2}
            y={H}
            textAnchor="middle"
            fill={today ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)'}
            fontSize="7"
            fontFamily="Inter, -apple-system, sans-serif"
          >
            {today ? 'today' : formatDayLabel(date)}
          </text>
        )
      })}
    </svg>
  )
}
