import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { questionsApi } from '../api/questions'
import type { Question } from '../types/question'

const SOURCE_BADGE: Record<string, string> = {
  radiopaedia: 'bg-blue-900/40 text-blue-400',
  statpearls: 'bg-purple-900/40 text-purple-400',
  radcored: 'bg-amber-900/40 text-amber-400',
  local: 'bg-surface-border text-slate-400',
}

export default function QuestionReviewPage() {
  const navigate = useNavigate()
  const [drafts, setDrafts] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<number | null>(null)
  const [editData, setEditData] = useState<Partial<Question>>({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    questionsApi.drafts()
      .then((res) => setDrafts(res.data))
      .finally(() => setLoading(false))
  }, [])

  const startEdit = (q: Question) => {
    setEditing(q.id)
    setEditData({
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      reference: q.reference,
      topic: q.topic,
      difficulty: q.difficulty,
    })
    setSuccess('')
  }

  const handleSaveAndActivate = async (id: number) => {
    setSaving(true)
    try {
      await questionsApi.update(id, editData)
      await questionsApi.activate(id)
      setDrafts((prev) => prev.filter((d) => d.id !== id))
      setEditing(null)
      setSuccess(`Question activated and added to the question bank.`)
    } catch {
      setSuccess('Error saving question.')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = async (id: number) => {
    if (!window.confirm('Delete this draft?')) return
    try {
      await questionsApi.delete(id)
      setDrafts((prev) => prev.filter((d) => d.id !== id))
    } catch { /* silent */ }
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Draft Questions</h1>
            <p className="text-slate-400 mt-1">Review imported cases and complete MCQ options before activating</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded-lg border border-surface-border text-slate-300 hover:border-slate-500 transition-all text-sm">
            ← Dashboard
          </button>
        </div>

        {success && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg px-4 py-3 text-green-300 text-sm mb-6">
            {success}
          </div>
        )}

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : drafts.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-lg mb-2">No draft questions</p>
            <p className="text-sm">Import cases from Radiopaedia via <code className="text-brand-500">POST /api/content/sync-radiopaedia</code></p>
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map((q) => (
              <div key={q.id} className="bg-surface-card rounded-xl border border-surface-border overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${SOURCE_BADGE[q.source] || SOURCE_BADGE.local}`}>
                      {q.source}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {q.topic} · {q.modality || 'any modality'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(q)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-brand-500/50 text-brand-500 hover:bg-brand-900/20 transition-all"
                    >
                      Edit & Activate
                    </button>
                    <button
                      onClick={() => handleDiscard(q.id)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-red-800/50 text-red-400 hover:bg-red-900/20 transition-all"
                    >
                      Discard
                    </button>
                  </div>
                </div>

                {/* Preview or edit form */}
                {editing === q.id ? (
                  <div className="p-5 space-y-4">
                    {q.image_url && (
                      <div className="text-xs text-slate-500">
                        Image: <a href={q.image_url} target="_blank" rel="noopener noreferrer" className="text-brand-500 underline">{q.image_url}</a>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Question Text</label>
                      <textarea
                        value={editData.question_text || ''}
                        onChange={(e) => setEditData({ ...editData, question_text: e.target.value })}
                        rows={3}
                        className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    {(['a', 'b', 'c', 'd'] as const).map((letter) => {
                      const key = `option_${letter}` as keyof typeof editData
                      return (
                        <div key={letter}>
                          <label className="block text-xs text-slate-400 mb-1">
                            Option {letter.toUpperCase()}
                            {editData.correct_answer === letter.toUpperCase() && (
                              <span className="ml-2 text-green-400">✓ correct</span>
                            )}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={(editData[key] as string) || ''}
                              onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                              className="flex-1 bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                            <button
                              type="button"
                              onClick={() => setEditData({ ...editData, correct_answer: letter.toUpperCase() })}
                              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${editData.correct_answer === letter.toUpperCase() ? 'bg-green-500 text-white' : 'border border-surface-border text-slate-400 hover:border-green-500 hover:text-green-400'}`}
                            >
                              ✓
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Teaching Point / Explanation</label>
                      <textarea
                        value={editData.explanation || ''}
                        onChange={(e) => setEditData({ ...editData, explanation: e.target.value })}
                        rows={3}
                        className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleSaveAndActivate(q.id)}
                        disabled={saving}
                        className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-all"
                      >
                        {saving ? 'Saving...' : '✓ Save & Activate'}
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="px-4 py-2.5 border border-surface-border text-slate-300 rounded-lg text-sm hover:border-slate-500 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-4">
                    <p className="text-slate-300 text-sm line-clamp-2">{q.question_text}</p>
                    {q.image_url && (
                      <p className="text-xs text-slate-500 mt-1">🖼 Image attached</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
