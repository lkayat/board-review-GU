import type { AggregateOut } from '../../types/session'

interface AggregateBarProps {
  aggregate: AggregateOut | null
  correctAnswer?: string
}

const CHOICE_COLORS: Record<string, string> = {
  A: 'bg-blue-500',
  B: 'bg-purple-500',
  C: 'bg-amber-500',
  D: 'bg-pink-500',
}

const CHOICE_CORRECT: Record<string, string> = {
  A: 'bg-green-500',
  B: 'bg-green-500',
  C: 'bg-green-500',
  D: 'bg-green-500',
}

export default function AggregateBar({ aggregate, correctAnswer }: AggregateBarProps) {
  if (!aggregate || aggregate.total_responses === 0) {
    return (
      <div className="text-slate-500 text-sm text-center py-2">
        No resident responses yet
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
        <span>Resident responses</span>
        <span className="font-mono">{aggregate.total_responses} answered</span>
      </div>
      {aggregate.choices.map(({ choice, count, pct }) => {
        const isCorrect = correctAnswer && choice === correctAnswer
        const barColor = isCorrect ? CHOICE_CORRECT[choice] : CHOICE_COLORS[choice]
        return (
          <div key={choice} className="flex items-center gap-3">
            <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0 ${isCorrect ? 'ring-2 ring-green-400 bg-green-500' : 'bg-surface-border'}`}>
              {choice}
            </span>
            <div className="flex-1 bg-surface rounded-full h-5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="w-24 text-right">
              <span className="text-white font-medium text-sm">{pct}%</span>
              <span className="text-slate-500 text-xs ml-1">({count})</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
