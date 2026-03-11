import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { questionsApi } from '../api/questions'
import type { QuestionStats, TopicStat } from '../types/question'
import type { SessionConfig } from '../types/session'

const MODALITIES = ['CT', 'MRI', 'US', 'XR', 'NM']
const DIFFICULTIES = [
  { value: '', label: 'All Levels' },
  { value: 'basic', label: 'Basic' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]
const TIMER_OPTIONS = [
  { value: 0, label: 'No Timer' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '60 seconds' },
  { value: 90, label: '90 seconds' },
  { value: 120, label: '2 minutes' },
]

export default function SessionBuilderPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<QuestionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [sessionName, setSessionName] = useState('')
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [selectedModalities, setSelectedModalities] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState('')
  const [nQuestions, setNQuestions] = useState(20)
  const [imagePct, setImagePct] = useState(50)
  const [timerSeconds, setTimerSeconds] = useState(0)

  useEffect(() => {
    questionsApi.stats()
      .then((res) => setStats(res.data))
      .catch(() => setError('Failed to load question bank stats.'))
      .finally(() => setLoading(false))
  }, [])

  const toggleTopic = (code: string) => {
    setSelectedTopics((prev) =>
      prev.includes(code) ? prev.filter((t) => t !== code) : [...prev, code]
    )
  }

  const toggleModality = (m: string) => {
    setSelectedModalities((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    )
  }

  const availableCount = () => {
    if (!stats) return 0
    if (selectedTopics.length === 0) return stats.total
    return stats.topics
      .filter((t) => selectedTopics.includes(t.topic))
      .reduce((sum, t) => sum + t.total, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedTopics.length === 0) {
      setError('Please select at least one topic.')
      return
    }
    setCreating(true)
    setError('')
    try {
      // Session creation wired in Sprint 2 — for now navigate to builder confirmation
      const config: SessionConfig = {
        topics: selectedTopics,
        modalities: selectedModalities.length > 0 ? selectedModalities : undefined,
        difficulty: difficulty || undefined,
        n_questions: nQuestions,
        image_pct: imagePct,
        timer_seconds: timerSeconds > 0 ? timerSeconds : undefined,
      }
      console.log('Session config ready (Sprint 2 will wire this):', { name: sessionName, config })
      alert('Session builder is configured! Session creation will be wired in Sprint 2.')
    } catch {
      setError('Failed to create session.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Build a Review Session</h1>
          <p className="text-slate-400 mt-1">Configure your GU imaging board review session</p>
        </div>

        {loading ? (
          <div className="text-slate-400 text-center py-12">Loading question bank...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Session Name */}
            <div className="bg-surface-card rounded-xl p-6 border border-surface-border">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Session Name <span className="text-slate-500">(optional)</span>
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g. Kidney & Adrenal Review — Thursday Conference"
                className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Topics */}
            <div className="bg-surface-card rounded-xl p-6 border border-surface-border">
              <h2 className="text-lg font-semibold text-white mb-1">Topics</h2>
              <p className="text-slate-400 text-sm mb-4">Select GU sub-topics to include</p>
              {stats && stats.topics.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stats.topics.map((t: TopicStat) => (
                    <button
                      key={t.topic}
                      type="button"
                      onClick={() => toggleTopic(t.topic)}
                      className={`flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-all ${
                        selectedTopics.includes(t.topic)
                          ? 'border-brand-500 bg-brand-900/30 text-white'
                          : 'border-surface-border bg-surface text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className="font-medium text-sm">{t.label}</span>
                      <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${
                        selectedTopics.includes(t.topic)
                          ? 'bg-brand-500 text-white'
                          : 'bg-surface-border text-slate-400'
                      }`}>
                        {t.total}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No topics found in question bank yet.</p>
              )}
              {selectedTopics.length > 0 && (
                <p className="mt-3 text-sm text-brand-500">
                  {availableCount()} questions available across selected topics
                </p>
              )}
            </div>

            {/* Number of Questions */}
            <div className="bg-surface-card rounded-xl p-6 border border-surface-border">
              <h2 className="text-lg font-semibold text-white mb-4">Number of Questions</h2>
              <div className="flex gap-3">
                {[10, 15, 20, 25, 30].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNQuestions(n)}
                    className={`flex-1 py-3 rounded-lg border font-semibold transition-all ${
                      nQuestions === n
                        ? 'border-brand-500 bg-brand-900/30 text-brand-500'
                        : 'border-surface-border text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Mix Slider */}
            <div className="bg-surface-card rounded-xl p-6 border border-surface-border">
              <h2 className="text-lg font-semibold text-white mb-1">Image Mix</h2>
              <p className="text-slate-400 text-sm mb-4">
                Percentage of image-based questions (with radiology images)
              </p>
              <div className="flex items-center gap-4">
                <span className="text-slate-400 text-sm w-16">Text only</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={10}
                  value={imagePct}
                  onChange={(e) => setImagePct(Number(e.target.value))}
                  className="flex-1 accent-brand-500"
                />
                <span className="text-slate-400 text-sm w-16 text-right">All images</span>
              </div>
              <p className="mt-2 text-center text-brand-500 font-medium">
                {imagePct}% image-based · {100 - imagePct}% text-only
              </p>
            </div>

            {/* Modality Filter */}
            <div className="bg-surface-card rounded-xl p-6 border border-surface-border">
              <h2 className="text-lg font-semibold text-white mb-1">Modality</h2>
              <p className="text-slate-400 text-sm mb-4">
                Filter by imaging modality <span className="text-slate-500">(leave blank for all)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {MODALITIES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleModality(m)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      selectedModalities.includes(m)
                        ? 'border-brand-500 bg-brand-900/30 text-brand-500'
                        : 'border-surface-border text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="bg-surface-card rounded-xl p-6 border border-surface-border">
              <h2 className="text-lg font-semibold text-white mb-4">Difficulty Level</h2>
              <div className="flex gap-3">
                {DIFFICULTIES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDifficulty(value)}
                    className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                      difficulty === value
                        ? 'border-brand-500 bg-brand-900/30 text-brand-500'
                        : 'border-surface-border text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Timer */}
            <div className="bg-surface-card rounded-xl p-6 border border-surface-border">
              <h2 className="text-lg font-semibold text-white mb-4">Timer per Question</h2>
              <div className="flex flex-wrap gap-3">
                {TIMER_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTimerSeconds(value)}
                    className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      timerSeconds === value
                        ? 'border-brand-500 bg-brand-900/30 text-brand-500'
                        : 'border-surface-border text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-3 pb-8">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 rounded-lg border border-surface-border text-slate-300 hover:border-slate-500 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || selectedTopics.length === 0}
                className="px-8 py-3 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-all"
              >
                {creating ? 'Building Session...' : 'Build Session →'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
