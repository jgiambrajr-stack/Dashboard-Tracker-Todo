'use client'

// Pure SVG line chart for trend-based log widgets (weight, sleep, miles, etc.)
// Y-axis is scaled to data range — small changes are visible.

interface DayData {
  date: string   // YYYY-MM-DD
  value: number
}

interface LineChartProps {
  data: DayData[]       // sorted oldest → newest, sparse ok
  goal?: number         // optional target reference line
  color?: string
  days?: number         // window to display (default 14)
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

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0]
}

export default function LineChart({
  data,
  goal,
  color = '#ff7820',
  days = 14,
}: LineChartProps) {
  const dates = getLastNDates(days)
  const byDate = Object.fromEntries(data.map((d) => [d.date, d.value]))

  // Only plot dates that have a value
  const points = dates
    .map((date, i) => ({ date, i, value: byDate[date] }))
    .filter((p) => p.value !== undefined) as { date: string; i: number; value: number }[]

  if (points.length === 0) {
    return (
      <div className="h-20 flex items-center justify-center">
        <span className="text-[10px]" style={{ color: 'rgba(17,17,17,0.2)' }}>No data yet</span>
      </div>
    )
  }

  // Layout
  const W = 280
  const H = 80
  const labelH = 14
  const chartH = H - labelH
  const padX = 8

  // Y scale — tight to data range with 10% padding
  const values = points.map((p) => p.value)
  if (goal !== undefined) values.push(goal)
  const dataMin = Math.min(...values)
  const dataMax = Math.max(...values)
  const range = dataMax - dataMin || 1
  const yPad = range * 0.2
  const yMin = dataMin - yPad
  const yMax = dataMax + yPad

  function xOf(i: number): number {
    return padX + (i / (days - 1)) * (W - padX * 2)
  }

  function yOf(v: number): number {
    return chartH - ((v - yMin) / (yMax - yMin)) * chartH
  }

  // Build polyline path
  const linePath = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xOf(p.i)} ${yOf(p.value)}`)
    .join(' ')

  // Build area fill path (close back along bottom)
  const areaPath = points.length > 1
    ? `${linePath} L ${xOf(points[points.length - 1].i)} ${chartH} L ${xOf(points[0].i)} ${chartH} Z`
    : null

  const goalY = goal !== undefined ? yOf(goal) : null
  const todayPoint = points.find((p) => isToday(p.date))

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="none"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Area fill */}
      {areaPath && (
        <path
          d={areaPath}
          fill={color}
          fillOpacity={0.06}
        />
      )}

      {/* Goal reference line */}
      {goalY !== null && (
        <>
          <line
            x1={padX} y1={goalY} x2={W - padX} y2={goalY}
            stroke="rgba(0,0,0,0.15)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <text
            x={W - padX - 2}
            y={goalY - 3}
            textAnchor="end"
            fill="rgba(0,0,0,0.3)"
            fontSize="7"
            fontFamily="Inter, -apple-system, sans-serif"
          >
            goal
          </text>
        </>
      )}

      {/* Line */}
      {points.length > 1 && (
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Dots */}
      {points.map((p) => {
        const x = xOf(p.i)
        const y = yOf(p.value)
        const today = isToday(p.date)
        return (
          <g key={p.date}>
            {today && (
              <circle cx={x} cy={y} r={6} fill={color} fillOpacity={0.15} />
            )}
            <circle
              cx={x} cy={y}
              r={today ? 3.5 : 2}
              fill={today ? color : '#fff'}
              stroke={color}
              strokeWidth={today ? 0 : 1.5}
            />
          </g>
        )
      })}

      {/* Today label */}
      {todayPoint && (
        <text
          x={xOf(todayPoint.i)}
          y={H}
          textAnchor="middle"
          fill="rgba(0,0,0,0.4)"
          fontSize="7"
          fontFamily="Inter, -apple-system, sans-serif"
        >
          today
        </text>
      )}

      {/* First date label */}
      {points.length > 1 && (
        <text
          x={xOf(points[0].i)}
          y={H}
          textAnchor="middle"
          fill="rgba(0,0,0,0.2)"
          fontSize="7"
          fontFamily="Inter, -apple-system, sans-serif"
        >
          {new Date(points[0].date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </text>
      )}
    </svg>
  )
}
