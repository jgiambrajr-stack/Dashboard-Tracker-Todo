'use client'

import { TrackerWidget } from '@/lib/types'
import NumberWidget from './NumberWidget'
import ScaleWidget from './ScaleWidget'
import CheckboxWidget from './CheckboxWidget'
import DurationWidget from './DurationWidget'

interface WidgetRendererProps {
  widget: TrackerWidget
  userId: string
  todayValue: number | null
  history: { date: string; value: number }[]
  accentColor?: string
}

export default function WidgetRenderer({ widget, userId, todayValue, history, accentColor }: WidgetRendererProps) {
  const props = { widget, userId, todayValue, history, accentColor }

  switch (widget.type) {
    case 'number':
      return <NumberWidget {...props} />
    case 'scale':
      return <ScaleWidget {...props} />
    case 'checkbox':
      return <CheckboxWidget {...props} />
    case 'duration':
      return <DurationWidget {...props} />
    default:
      return (
        <div className="rounded-xl p-4 text-sm text-center" style={{ color: 'rgba(17,17,17,0.4)', background: 'rgba(0,0,0,0.03)' }}>
          Unknown widget type: {(widget as TrackerWidget).type}
        </div>
      )
  }
}
