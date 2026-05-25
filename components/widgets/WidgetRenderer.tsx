'use client'

import { TrackerWidget } from '@/lib/types'
import NumberWidget from './NumberWidget'
import ScaleWidget from './ScaleWidget'
import CheckboxWidget from './CheckboxWidget'
import DurationWidget from './DurationWidget'
import ChallengeWidget from './ChallengeWidget'
import TimerWidget from './TimerWidget'
import JournalWidget from './JournalWidget'
import PhotoWidget from './PhotoWidget'

interface WidgetRendererProps {
  widget: TrackerWidget
  userId: string
  todayValue: number | null
  history: { date: string; value: number }[]
  accentColor?: string
}

export default function WidgetRenderer({ widget, userId, todayValue, history, accentColor }: WidgetRendererProps) {
  const shared = { widget, userId, accentColor }

  switch (widget.type) {
    case 'number':
      return <NumberWidget {...shared} todayValue={todayValue} history={history} />
    case 'scale':
      return <ScaleWidget {...shared} todayValue={todayValue} history={history} />
    case 'checkbox':
      return <CheckboxWidget {...shared} todayValue={todayValue} history={history} />
    case 'duration':
      return <DurationWidget {...shared} todayValue={todayValue} history={history} />
    case 'challenge':
      return <ChallengeWidget {...shared} history={history} />
    case 'timer':
      return <TimerWidget {...shared} />
    case 'journal':
      return <JournalWidget {...shared} />
    case 'photo':
      return <PhotoWidget {...shared} />
    default:
      return (
        <div className="rounded-xl p-4 text-sm text-center" style={{ color: 'rgba(17,17,17,0.4)', background: 'rgba(0,0,0,0.03)' }}>
          Unknown widget type: {(widget as TrackerWidget).type}
        </div>
      )
  }
}
