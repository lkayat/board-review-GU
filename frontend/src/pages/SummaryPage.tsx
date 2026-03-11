import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionsApi } from '../api/sessions'
import type { SessionSummary, QuestionReview } from '../types/session'

const TOPIC_LABELS: Record<string, string> = {
  kidney: 'Kidneys', bladder: 'Bladder', prostate: 'Prostate',
  adrenal: 'Adrenal', ureter: 'Ureter', urethra: 'Urethra',
  scrotum: 'Scrotum/Testes', female_gu: 'Female GU', retroperitoneum: 'Retroperitoneum',
}

export default function SummaryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    if (!id) return
    sessionsApi.summary(Number(id))
      .then((res) => setSummary(res.data))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center min-h-screen text-slate-400">Loading summary...</div>
  if (!summary) return <div className="flex items-center justify-center min-h-screen text-red-400">Summary not found</div>

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Session Summary</h1>
            {summary.session_name && <p className="text-slate-400 mt-1">{summary.session_name}</p>}
          </div>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded-lg border border-surface-border text-slate-300 hover:border-slate-500 transition-all text-sm">
            ← Dashboard
          </button>
        </div>

        {/* Overall score */}
        <div className="bg-surface-card rounded-2xl border border-surface-border p-8 text-center">
          <div className="text-6xl font-bold text-white mb-2">
            {summary.overall_pct_correct}%
          </div>
          <p className="text-slate-400">
            Overall resident score · {summary.total_questions} questions
          </p>
          {summary.overall_pct_correct === 0 && (
            <p className="text-slate-600 text-sm mt-1">(No resident responses recorded)</p>
          )}
        </div>

        {/* Per-topic breakdown */}
        {summary.topics.length > 0 && (
          <div className="bg-surface-card rounded-2xl border border-surface-border p-6">
            <h2 className="text-lg font-semibold text-white mb-5">By Topic</h2>
            <div className="space-y-4">
              {summary.topics.map((t) => (
                <div key={t.topic}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-300 text-sm font-medium">
                      {TOPIC_LABELS[t.topic] || t.topic}
                    </span>
                    <span className="text-white text-sm font-semibold">
                      {t.pct_correct}% <span className="text-slate-500 font-normal">({t.total_questions} Q)</span>
                    </span>
                  </div>
                  <div className="w-full bg-surface rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-brand-500 transition-all duration-700"
                      style={{ width: `${t.pct_correct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Question review list */}
        <div className="bg-surface-card rounded-2xl border border-surface-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Question Review</h2>
          <div className="space-y-3">
            {summary.questions.map((q: QuestionReview) => (
              <div key={q.question_index} className="border border-surface-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface/50 transition-all"
                  onClick={() => setExpanded(expanded === q.question_index ? null : q.question_index)}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 flex items-center justify-center bg-surface-border rounded-full text-xs font-mono text-slate-400">
                      {q.question_index + 1}
                    </span>
                    <span className="text-slate-200 text-sm line-clamp-1">{q.question_text}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className="text-xs text-slate-400">
                      {q.resident_pct_correct > 0 ? `${q.resident_pct_correct}% correct` : 'No responses'}
                    </span>
                    <span className="w-6 h-6 flex items-center justify-center bg-green-900/40 text-green-400 rounded text-xs font-bold">
                      {q.correct_answer}
                    </span>
                    <span className="text-slate-500">{expanded === q.question_index ? '▲' : '▼'}</span>
                  </div>
                </button>
                {expanded === q.question_index && q.explanation && (
                  <div className="px-5 py-4 bg-surface border-t border-surface-border">
                    <p className="text-slate-200 text-sm leading-relaxed">{q.explanation}</p>
                    {q.aggregate && q.aggregate.total_responses > 0 && (
                      <div className="mt-3 pt-3 border-t border-surface-border">
                        <p className="text-xs text-slate-500 mb-2">
                          {q.aggregate.total_responses} resident response{q.aggregate.total_responses !== 1 ? 's' : ''}
                        </p>
                        <div className="flex gap-2">
                          {q.aggregate.choices.map(({ choice, pct }) => (
                            <div key={choice} className={`flex-1 text-center py-1 rounded text-xs font-medium ${choice === q.correct_answer ? 'bg-green-900/40 text-green-400' : 'bg-surface-border text-slate-400'}`}>
                              {choice}: {pct}%
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* New session button */}
        <div className="flex justify-center pb-8">
          <button
            onClick={() => navigate('/session/new')}
            className="px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-all"
          >
            Build New Session →
          </button>
        </div>
      </div>
    </div>
  )
}
