import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { questionsApi } from '../api/questions'
import type { Question } from '../types/question'

const TOPIC_LABELS: Record<string, string> = {
  kidney: 'Kidneys', bladder: 'Bladder', prostate: 'Prostate',
  adrenal: 'Adrenal', ureter: 'Ureter', urethra: 'Urethra',
  scrotum: 'Scrotum / Testes', female_gu: 'Female GU', retroperitoneum: 'Retroperitoneum',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-900/40 text-green-400',
  pending_review: 'bg-amber-900/40 text-amber-400',
  draft: 'bg-surface-border text-slate-400',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  pending_review: 'Pending Review',
  draft: 'Draft',
}

const DIFFICULTY_COLORS: Record<string, string> = {
  basic: 'text-green-400',
  intermediate: 'text-amber-400',
  advanced: 'text-red-400',
}

const TOPICS = ['', 'kidney', 'bladder', 'prostate', 'adrenal', 'ureter', 'urethra', 'scrotum', 'female_gu', 'retroperitoneum']
const DIFFICULTIES = ['', 'basic', 'intermediate', 'advanced']

type Tab = 'all' | 'pending_review' | 'active' | 'draft'

interface EditData {
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  explanation: string
  reference: string
  image_url: string
  topic: string
  subtopic: string
  modality: string
  difficulty: string
  is_image_based: boolean
}

function emptyEdit(q: Question): EditData {
  return {
    question_text: q.question_text || '',
    option_a: q.option_a || '',
    option_b: q.option_b || '',
    option_c: q.option_c || '',
    option_d: q.option_d || '',
    correct_answer: q.correct_answer || 'A',
    explanation: q.explanation || '',
    reference: q.reference || '',
    image_url: q.image_url || '',
    topic: q.topic || '',
    subtopic: q.subtopic || '',
    modality: q.modality || '',
    difficulty: q.difficulty || 'basic',
    is_image_based: q.is_image_based || false,
  }
}

export default function QuestionBankPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab) || 'pending_review'

  const [tab, setTab] = useState<Tab>(initialTab)
  const [questions, setQuestions] = useState<Question[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [filterTopic, setFilterTopic] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [search, setSearch] = useState('')

  const [editing, setEditing] = useState<number | null>(null)
  const [editData, setEditData] = useState<EditData | null>(null)
  const [saving, setSaving] = useState<string | null>(null) // 'save' | 'approve' | 'deactivate' | 'review'
  const [toast, setToast] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadCounts = async () => {
    const [pendingRes, allRes] = await Promise.all([
      questionsApi.pendingCount(),
      questionsApi.all(),
    ])
    const all = allRes.data
    setCounts({
      all: all.length,
      pending_review: pendingRes.data.count,
      active: all.filter(q => q.status === 'active').length,
      draft: all.filter(q => q.status === 'draft').length,
    })
  }

  const loadQuestions = async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = {}
      if (tab !== 'all') params.status = tab
      if (filterTopic) params.topic = filterTopic
      if (filterDifficulty) params.difficulty = filterDifficulty
      if (search) params.search = search
      const res = await questionsApi.all(params)
      setQuestions(res.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCounts() }, [])
  useEffect(() => { loadQuestions() }, [tab, filterTopic, filterDifficulty, search])

  const switchTab = (t: Tab) => {
    setTab(t)
    setEditing(null)
    setSearchParams(t !== 'pending_review' ? { tab: t } : {})
  }

  const startEdit = (q: Question) => {
    setEditing(q.id)
    setEditData(emptyEdit(q))
  }

  const cancelEdit = () => {
    setEditing(null)
    setEditData(null)
  }

  const handleSave = async (id: number) => {
    if (!editData) return
    setSaving('save')
    try {
      const updated = await questionsApi.update(id, editData)
      setQuestions(prev => prev.map(q => q.id === id ? updated.data : q))
      setEditing(null)
      showToast('Changes saved.')
    } catch { showToast('Error saving.') }
    finally { setSaving(null) }
  }

  const handleApprove = async (id: number) => {
    if (!editData) return
    setSaving('approve')
    try {
      await questionsApi.update(id, editData)
      const activated = await questionsApi.activate(id)
      setQuestions(prev => prev.filter(q => q.id !== id))
      setCounts(c => ({ ...c, pending_review: Math.max(0, (c.pending_review || 0) - 1), active: (c.active || 0) + 1 }))
      setEditing(null)
      showToast(`Question approved and activated.`)
      void activated
    } catch { showToast('Error approving.') }
    finally { setSaving(null) }
  }

  const handleDeactivate = async (id: number) => {
    setSaving('deactivate')
    try {
      await questionsApi.deactivate(id)
      setQuestions(prev => prev.filter(q => q.id !== id))
      setCounts(c => ({ ...c, active: Math.max(0, (c.active || 0) - 1), draft: (c.draft || 0) + 1 }))
      setEditing(null)
      showToast('Question moved to draft.')
    } catch { showToast('Error deactivating.') }
    finally { setSaving(null) }
  }

  const handleSubmitReview = async (id: number) => {
    if (!editData) return
    setSaving('review')
    try {
      await questionsApi.update(id, editData)
      await questionsApi.submitReview(id)
      setQuestions(prev => prev.filter(q => q.id !== id))
      setCounts(c => ({ ...c, draft: Math.max(0, (c.draft || 0) - 1), pending_review: (c.pending_review || 0) + 1 }))
      setEditing(null)
      showToast('Question submitted for review.')
    } catch { showToast('Error submitting.') }
    finally { setSaving(null) }
  }

  const handleSendBackDraft = async (id: number) => {
    setSaving('deactivate')
    try {
      await questionsApi.deactivate(id)
      setQuestions(prev => prev.filter(q => q.id !== id))
      setCounts(c => ({ ...c, pending_review: Math.max(0, (c.pending_review || 0) - 1), draft: (c.draft || 0) + 1 }))
      setEditing(null)
      showToast('Question sent back to draft.')
    } catch { showToast('Error.') }
    finally { setSaving(null) }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Permanently delete this question?')) return
    try {
      await questionsApi.delete(id)
      setQuestions(prev => prev.filter(q => q.id !== id))
      await loadCounts()
      setEditing(null)
      showToast('Question deleted.')
    } catch { showToast('Error deleting.') }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const res = await questionsApi.importJson(file)
      showToast(`Imported ${res.data.inserted} questions → Pending Review.`)
      await loadCounts()
      switchTab('pending_review')
    } catch { showToast('Import failed. Check JSON format.') }
    finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'pending_review', label: `Pending Review (${counts.pending_review ?? '…'})` },
    { id: 'active', label: `Active (${counts.active ?? '…'})` },
    { id: 'draft', label: `Draft (${counts.draft ?? '…'})` },
    { id: 'all', label: `All (${counts.all ?? '…'})` },
  ]

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Question Bank</h1>
            <p className="text-slate-400 mt-1 text-sm">Review, edit, and approve questions before they appear in sessions</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="px-4 py-2 rounded-lg border border-brand-500/60 text-brand-500 hover:bg-brand-900/20 text-sm transition-all disabled:opacity-50"
            >
              {importing ? 'Importing…' : '↑ Import JSON'}
            </button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-lg border border-surface-border text-slate-300 hover:border-slate-500 text-sm transition-all"
            >
              ← Dashboard
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mb-4 bg-green-900/30 border border-green-700 rounded-lg px-4 py-2 text-green-300 text-sm">
            {toast}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-surface-border">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2 -mb-px ${
                tab === t.id
                  ? 'border-brand-500 text-brand-500 bg-brand-900/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <select
            value={filterTopic}
            onChange={e => setFilterTopic(e.target.value)}
            className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Topics</option>
            {TOPICS.filter(Boolean).map(t => (
              <option key={t} value={t}>{TOPIC_LABELS[t] || t}</option>
            ))}
          </select>
          <select
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value)}
            className="bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Levels</option>
            {DIFFICULTIES.filter(Boolean).map(d => (
              <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
            ))}
          </select>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search question text…"
            className="flex-1 bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder-slate-600"
          />
        </div>

        {/* Question list */}
        {loading ? (
          <p className="text-slate-500 text-sm">Loading…</p>
        ) : questions.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-lg mb-2">No questions found</p>
            {tab === 'pending_review' && (
              <p className="text-sm">All questions have been reviewed, or import a JSON file to add more.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map(q => (
              <div key={q.id} className="bg-surface-card rounded-xl border border-surface-border overflow-hidden">
                {/* Row header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${STATUS_COLORS[q.status] || ''}`}>
                      {STATUS_LABELS[q.status] || q.status}
                    </span>
                    <span className={`text-xs flex-shrink-0 ${DIFFICULTY_COLORS[q.difficulty || ''] || 'text-slate-400'}`}>
                      {q.difficulty}
                    </span>
                    <span className="text-xs text-slate-500 flex-shrink-0">·</span>
                    <span className="text-xs text-slate-400 flex-shrink-0">{TOPIC_LABELS[q.topic] || q.topic}</span>
                    {q.is_image_based && <span className="text-xs text-slate-500 flex-shrink-0">· 🖼</span>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => editing === q.id ? cancelEdit() : startEdit(q)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-brand-500/50 text-brand-500 hover:bg-brand-900/20 transition-all"
                    >
                      {editing === q.id ? 'Close' : 'Edit'}
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-red-800/50 text-red-400 hover:bg-red-900/20 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Preview (collapsed) */}
                {editing !== q.id && (
                  <div className="px-5 py-3">
                    <p className="text-slate-300 text-sm line-clamp-2">{q.question_text}</p>
                    {q.image_url && (
                      <p className="text-xs text-slate-500 mt-1">Image: <span className="font-mono text-slate-600">{q.image_url.slice(0, 60)}{q.image_url.length > 60 ? '…' : ''}</span></p>
                    )}
                  </div>
                )}

                {/* Edit form (expanded) */}
                {editing === q.id && editData && (
                  <div className="p-5 space-y-4">
                    {/* Question text */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Question Text</label>
                      <textarea
                        value={editData.question_text}
                        onChange={e => setEditData({ ...editData, question_text: e.target.value })}
                        rows={3}
                        className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    {/* Options */}
                    {(['a', 'b', 'c', 'd'] as const).map(letter => {
                      const key = `option_${letter}` as keyof EditData
                      const isCorrect = editData.correct_answer === letter.toUpperCase()
                      return (
                        <div key={letter}>
                          <label className="block text-xs text-slate-400 mb-1">
                            Option {letter.toUpperCase()}
                            {isCorrect && <span className="ml-2 text-green-400">✓ correct</span>}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editData[key] as string}
                              onChange={e => setEditData({ ...editData, [key]: e.target.value })}
                              className="flex-1 bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                            <button
                              type="button"
                              onClick={() => setEditData({ ...editData, correct_answer: letter.toUpperCase() })}
                              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${isCorrect ? 'bg-green-600 text-white' : 'border border-surface-border text-slate-400 hover:border-green-500 hover:text-green-400'}`}
                            >
                              ✓
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    {/* Explanation */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Teaching Point / Explanation</label>
                      <textarea
                        value={editData.explanation}
                        onChange={e => setEditData({ ...editData, explanation: e.target.value })}
                        rows={4}
                        className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    {/* Reference */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Reference</label>
                      <input
                        type="text"
                        value={editData.reference}
                        onChange={e => setEditData({ ...editData, reference: e.target.value })}
                        className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    {/* Image URL */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Image URL <span className="text-slate-600">(paste any public HTTPS URL)</span></label>
                      <input
                        type="text"
                        value={editData.image_url}
                        onChange={e => {
                          const url = e.target.value
                          setEditData({ ...editData, image_url: url, is_image_based: url.length > 0 })
                        }}
                        placeholder="https://…"
                        className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                      />
                      {editData.image_url && (
                        <div className="mt-2">
                          <img
                            src={editData.image_url}
                            alt="Preview"
                            className="max-h-32 rounded border border-surface-border object-contain"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Meta fields */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Topic</label>
                        <select
                          value={editData.topic}
                          onChange={e => setEditData({ ...editData, topic: e.target.value })}
                          className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                        >
                          {TOPICS.filter(Boolean).map(t => (
                            <option key={t} value={t}>{TOPIC_LABELS[t] || t}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Difficulty</label>
                        <select
                          value={editData.difficulty}
                          onChange={e => setEditData({ ...editData, difficulty: e.target.value })}
                          className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                        >
                          {DIFFICULTIES.filter(Boolean).map(d => (
                            <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Modality</label>
                        <select
                          value={editData.modality}
                          onChange={e => setEditData({ ...editData, modality: e.target.value })}
                          className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                        >
                          {['CT', 'MRI', 'US', 'XR', 'NM'].map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Action buttons — vary by question status */}
                    <div className="flex flex-wrap gap-3 pt-2 border-t border-surface-border">
                      {q.status === 'pending_review' && (
                        <>
                          <button
                            onClick={() => handleApprove(q.id)}
                            disabled={saving !== null}
                            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-all"
                          >
                            {saving === 'approve' ? 'Activating…' : '✓ Approve & Activate'}
                          </button>
                          <button
                            onClick={() => handleSave(q.id)}
                            disabled={saving !== null}
                            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-all"
                          >
                            {saving === 'save' ? 'Saving…' : 'Save Edits'}
                          </button>
                          <button
                            onClick={() => handleSendBackDraft(q.id)}
                            disabled={saving !== null}
                            className="px-4 py-2.5 border border-surface-border text-slate-300 rounded-lg text-sm hover:border-slate-500 transition-all"
                          >
                            Back to Draft
                          </button>
                        </>
                      )}
                      {q.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleSave(q.id)}
                            disabled={saving !== null}
                            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-all"
                          >
                            {saving === 'save' ? 'Saving…' : 'Save Changes'}
                          </button>
                          <button
                            onClick={() => handleDeactivate(q.id)}
                            disabled={saving !== null}
                            className="px-4 py-2.5 border border-amber-700/50 text-amber-400 rounded-lg text-sm hover:bg-amber-900/20 transition-all"
                          >
                            Deactivate
                          </button>
                        </>
                      )}
                      {q.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleSave(q.id)}
                            disabled={saving !== null}
                            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-all"
                          >
                            {saving === 'save' ? 'Saving…' : 'Save Edits'}
                          </button>
                          <button
                            onClick={() => handleSubmitReview(q.id)}
                            disabled={saving !== null}
                            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-all"
                          >
                            {saving === 'review' ? 'Submitting…' : 'Submit for Review'}
                          </button>
                        </>
                      )}
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2.5 border border-surface-border text-slate-400 rounded-lg text-sm hover:border-slate-500 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
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
