import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sessionsApi } from '../api/sessions'
import { questionsApi } from '../api/questions'
import type { Session } from '../types/session'

const STATUS_BADGE: Record<string, string> = {
  building: 'bg-slate-700 text-slate-300',
  active: 'bg-green-900/40 text-green-400',
  paused: 'bg-amber-900/40 text-amber-400',
  completed: 'bg-surface-border text-slate-400',
}

export default function ProfessorDashboard() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<Session[]>([])
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([sessionsApi.list(), questionsApi.stats()])
      .then(([sRes, qRes]) => {
        setSessions(sRes.data)
        setTotalQuestions(qRes.data.total)
      })
      .finally(() => setLoading(false))
  }, [])

  const resumeSession = (s: Session) => {
    if (s.status === 'building') {
      navigate(`/session/${s.id}/present`)
    } else if (s.status === 'active') {
      navigate(`/session/${s.id}/present`)
    } else if (s.status === 'completed') {
      navigate(`/session/${s.id}/summary`)
    }
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">GU Board Review</h1>
            <p className="text-slate-400 mt-1">Professor Dashboard</p>
          </div>
          <button
            onClick={() => navigate('/session/new')}
            className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-all"
          >
            + New Session
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-surface-card border border-surface-border rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-white">{totalQuestions}</div>
            <div className="text-slate-400 text-sm mt-1">Questions in bank</div>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-white">{sessions.filter(s => s.status === 'completed').length}</div>
            <div className="text-slate-400 text-sm mt-1">Sessions run</div>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-xl p-5 text-center">
            <div className="text-3xl font-bold text-white">{sessions.filter(s => s.status === 'active').length}</div>
            <div className="text-slate-400 text-sm mt-1">Active now</div>
          </div>
        </div>

        {/* Session list */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Sessions</h2>
          {loading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 mb-4">No sessions yet</p>
              <button
                onClick={() => navigate('/session/new')}
                className="px-6 py-2.5 border border-brand-500 text-brand-500 rounded-lg hover:bg-brand-900/20 transition-all text-sm"
              >
                Build your first session
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => {
                const qCount = JSON.parse(s.question_ids || '[]').length
                const config = s.config ? JSON.parse(s.config) : {}
                return (
                  <button
                    key={s.id}
                    onClick={() => resumeSession(s)}
                    className="w-full flex items-center justify-between px-4 py-4 rounded-xl border border-surface-border hover:bg-surface/50 transition-all text-left"
                  >
                    <div>
                      <div className="text-white font-medium">
                        {s.name || `Session #${s.id}`}
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        {qCount} questions · {config.topics?.map((t: string) => t).join(', ')}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-xs font-mono">{s.code}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[s.status] || ''}`}>
                        {s.status}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="mt-6 flex gap-3 text-sm">
          <button
            onClick={() => navigate('/join')}
            className="text-slate-500 hover:text-slate-300 underline-offset-2 hover:underline transition-all"
          >
            Resident join page →
          </button>
          <span className="text-slate-700">·</span>
          <button
            onClick={() => navigate('/questions/drafts')}
            className="text-slate-500 hover:text-slate-300 underline-offset-2 hover:underline transition-all"
          >
            Review imported drafts →
          </button>
        </div>
      </div>
    </div>
  )
}
