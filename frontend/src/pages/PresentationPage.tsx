import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { sessionsApi } from '../api/sessions'
import { useSessionStore } from '../store/sessionStore'
import { useSessionSocket } from '../hooks/useSessionSocket'
import { useSessionTimer } from '../hooks/useSessionTimer'
import ImageViewer from '../components/presentation/ImageViewer'
import AggregateBar from '../components/presentation/AggregateBar'
import type { Session } from '../types/session'

const TOPIC_LABELS: Record<string, string> = {
  kidney: 'Kidneys', bladder: 'Bladder', prostate: 'Prostate',
  adrenal: 'Adrenal', ureter: 'Ureter', urethra: 'Urethra',
  scrotum: 'Scrotum/Testes', female_gu: 'Female GU', retroperitoneum: 'Retroperitoneum',
}

interface CurrentQuestion {
  id: number
  question_text: string
  option_a: string; option_b: string; option_c: string; option_d: string
  is_image_based: boolean
  image_url?: string; image_type?: string; image_frames?: string[]
  source?: string; external_id?: string
  correct_answer?: string
  explanation?: string
  reference?: string
  topic: string
}

export default function PresentationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const sessionId = Number(id)

  const [session, setSession] = useState<Session | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null)
  const [revealedAnswer, setRevealedAnswer] = useState<{ correct: string; explanation?: string; reference?: string } | null>(null)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const aggregate = useSessionStore((s) => s.aggregate)
  const residentCount = useSessionStore((s) => s.residentCount)
  const setAggregate = useSessionStore((s) => s.setAggregate)

  // Timer
  const timerConfig = session?.config ? JSON.parse(session.config)?.timer_seconds ?? 0 : 0
  const timer = useSessionTimer(timerConfig)

  // Load session on mount
  useEffect(() => {
    if (!sessionId) return
    sessionsApi.get(sessionId)
      .then((res) => {
        setSession(res.data)
        const ids = JSON.parse(res.data.question_ids || '[]')
        setTotalQuestions(ids.length)
      })
      .catch(() => setError('Session not found'))
      .finally(() => setLoading(false))
  }, [sessionId])

  // WS event handlers
  const handleQuestionChanged = useCallback((msg: { data: { index: number; total: number; question: unknown; is_revealed: boolean } }) => {
    const q = msg.data.question as CurrentQuestion
    setCurrentQuestion(q)
    setRevealedAnswer(null)
    setAggregate(null)
    setTotalQuestions(msg.data.total)
    setSession((prev) => prev ? { ...prev, current_index: msg.data.index, is_revealed: false } : prev)
    if (timerConfig > 0) { timer.reset(timerConfig); timer.start() }
  }, [timerConfig])

  const handleAnswerRevealed = useCallback((msg: { data: { correct: string; explanation?: string; reference?: string; aggregate: unknown } }) => {
    setRevealedAnswer({ correct: msg.data.correct, explanation: msg.data.explanation, reference: msg.data.reference })
    setSession((prev) => prev ? { ...prev, is_revealed: true } : prev)
    timer.stop()
  }, [timer])

  const handleSessionEnded = useCallback((summaryUrl: string) => {
    navigate(summaryUrl)
  }, [navigate])

  const handleTimerTick = useCallback((remaining: number) => {
    timer.reset(remaining)
  }, [timer])

  useSessionSocket({
    sessionCode: session?.code || '',
    role: 'professor',
    onQuestionChanged: handleQuestionChanged,
    onAnswerRevealed: handleAnswerRevealed,
    onSessionEnded: handleSessionEnded,
    onTimerTick: handleTimerTick,
  })

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight' || e.key === 'n') handleNext()
      if (e.key === 'ArrowLeft' || e.key === 'p') handlePrev()
      if (e.key === ' ' || e.key === 'r') { e.preventDefault(); handleReveal() }
      if (e.key === 'f') toggleFullscreen()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [session])

  const handleStart = async () => {
    if (!session) return
    try {
      const res = await sessionsApi.start(session.id)
      setSession(res.data)
      // Load first question via REST (WS not connected yet on very first start)
      await loadCurrentQuestion(res.data)
      if (timerConfig > 0) { timer.reset(timerConfig); timer.start() }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Failed to start session')
    }
  }

  const loadCurrentQuestion = async (s: Session) => {
    // Fetch the session join data to get current question details
    try {
      const res = await sessionsApi.joinByCode(s.code)
      if (res.data.current_question) {
        setCurrentQuestion(res.data.current_question as CurrentQuestion)
        setTotalQuestions(res.data.total_questions)
      }
    } catch { /* silent */ }
  }

  const handleNext = async () => {
    if (!session) return
    try {
      const res = await sessionsApi.advance(session.id, 'next')
      setSession(res.data)
      setRevealedAnswer(null)
      setAggregate(null)
      await loadCurrentQuestion(res.data)
      if (timerConfig > 0) { timer.reset(timerConfig); timer.start() }
    } catch { /* at last question */ }
  }

  const handlePrev = async () => {
    if (!session) return
    try {
      const res = await sessionsApi.advance(session.id, 'prev')
      setSession(res.data)
      setRevealedAnswer(null)
      setAggregate(null)
      await loadCurrentQuestion(res.data)
    } catch { /* at first question */ }
  }

  const handleReveal = async () => {
    if (!session || session.is_revealed) return
    try {
      await sessionsApi.reveal(session.id)
      // Answer data will come via WS; also fetch via REST as fallback
      const res = await sessionsApi.joinByCode(session.code)
      if (res.data.current_question?.correct_answer) {
        setRevealedAnswer({
          correct: res.data.current_question.correct_answer,
          explanation: res.data.current_question.explanation,
        })
        setSession((prev) => prev ? { ...prev, is_revealed: true } : prev)
      }
      timer.stop()
    } catch { /* silent */ }
  }

  const handleEnd = async () => {
    if (!session) return
    if (!window.confirm('End this session? This will close it for all residents.')) return
    await sessionsApi.complete(session.id)
    navigate(`/session/${session.id}/summary`)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true))
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false))
    }
  }

  const joinUrl = session ? `${window.location.origin}/join/${session.code}` : ''

  if (loading) return <div className="flex items-center justify-center min-h-screen text-slate-400">Loading session...</div>
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-400">{error}</div>
  if (!session) return null

  const isActive = session.status === 'active'
  const qIndex = session.current_index
  const choices = currentQuestion
    ? [
        { key: 'A', text: currentQuestion.option_a },
        { key: 'B', text: currentQuestion.option_b },
        { key: 'C', text: currentQuestion.option_c },
        { key: 'D', text: currentQuestion.option_d },
      ]
    : []

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-surface-card border-b border-surface-border flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-white font-semibold">
            {session.name || 'GU Board Review'}
          </span>
          {currentQuestion && (
            <span className="text-slate-400 text-sm">
              Q {qIndex + 1} / {totalQuestions}
              {currentQuestion.topic && (
                <span className="ml-2 px-2 py-0.5 bg-brand-900/40 text-brand-500 rounded text-xs">
                  {TOPIC_LABELS[currentQuestion.topic] || currentQuestion.topic}
                </span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Timer */}
          {timerConfig > 0 && isActive && (
            <div className={`font-mono text-lg font-bold ${timer.remaining <= 10 ? 'text-red-400' : 'text-white'}`}>
              ⏱ {timer.remaining}s
            </div>
          )}
          {/* Resident count */}
          {isActive && (
            <span className="text-slate-400 text-sm">
              👥 {residentCount} resident{residentCount !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={() => setShowQR(!showQR)}
            className="px-3 py-1.5 rounded-lg border border-surface-border text-slate-300 text-sm hover:border-slate-500 transition-all"
          >
            QR
          </button>
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 rounded-lg border border-surface-border text-slate-300 text-sm hover:border-slate-500 transition-all"
          >
            {isFullscreen ? '⊠' : '⛶'}
          </button>
          <button
            onClick={handleEnd}
            className="px-3 py-1.5 rounded-lg border border-red-800 text-red-400 text-sm hover:bg-red-900/20 transition-all"
          >
            End Session
          </button>
        </div>
      </div>

      {/* QR overlay */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowQR(false)}>
          <div className="bg-white p-8 rounded-2xl text-center" onClick={(e) => e.stopPropagation()}>
            <QRCodeSVG value={joinUrl} size={220} />
            <p className="mt-4 font-mono text-2xl font-bold text-gray-800 tracking-widest">{session.code}</p>
            <p className="text-gray-500 text-sm mt-1">Scan to join on your device</p>
            <button onClick={() => setShowQR(false)} className="mt-4 text-gray-400 text-sm underline">Close</button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Not started yet */}
        {session.status === 'building' && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-20">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                {session.name || 'Session Ready'}
              </h2>
              <p className="text-slate-400">{totalQuestions} questions loaded</p>
              <p className="text-slate-500 text-sm mt-1">
                Residents join at: <span className="text-brand-500 font-mono">{joinUrl}</span>
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl">
              <QRCodeSVG value={joinUrl} size={160} />
            </div>
            <p className="text-slate-300 font-mono text-3xl font-bold tracking-widest">{session.code}</p>
            <button
              onClick={handleStart}
              className="px-10 py-4 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-lg rounded-xl transition-all"
            >
              Start Session →
            </button>
          </div>
        )}

        {/* Active session */}
        {isActive && currentQuestion && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Progress bar */}
            <div className="w-full bg-surface-border rounded-full h-1.5">
              <div
                className="bg-brand-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${((qIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>

            {/* Image */}
            {currentQuestion.is_image_based && currentQuestion.image_url && (
              <ImageViewer
                imageUrl={currentQuestion.image_url}
                imageType={currentQuestion.image_type}
                imageFrames={currentQuestion.image_frames}
                alt="Radiology case image"
              />
            )}

            {/* Question text */}
            <div className="bg-surface-card rounded-xl p-6 border border-surface-border">
              <p className="text-white text-lg leading-relaxed">{currentQuestion.question_text}</p>
            </div>

            {/* Choices */}
            <div className="grid grid-cols-1 gap-3">
              {choices.map(({ key, text }) => {
                const isCorrect = revealedAnswer?.correct === key
                const isWrong = revealedAnswer && !isCorrect
                return (
                  <div
                    key={key}
                    className={`flex items-start gap-4 px-5 py-4 rounded-xl border transition-all ${
                      isCorrect
                        ? 'border-green-500 bg-green-900/20'
                        : isWrong
                          ? 'border-surface-border bg-surface opacity-50'
                          : 'border-surface-border bg-surface-card'
                    }`}
                  >
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold flex-shrink-0 ${
                      isCorrect ? 'bg-green-500 text-white' : 'bg-surface-border text-slate-300'
                    }`}>
                      {key}
                    </span>
                    <span className={`text-base ${isCorrect ? 'text-green-200 font-medium' : 'text-slate-200'}`}>
                      {text}
                    </span>
                    {isCorrect && <span className="ml-auto text-green-400 font-bold">✓</span>}
                  </div>
                )
              })}
            </div>

            {/* Reveal panel */}
            {revealedAnswer && (
              <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-green-400 font-semibold">Teaching Point</span>
                </div>
                {revealedAnswer.explanation && (
                  <p className="text-slate-200 text-sm leading-relaxed">{revealedAnswer.explanation}</p>
                )}
                {revealedAnswer.reference && (
                  <p className="text-slate-500 text-xs italic">📖 {revealedAnswer.reference}</p>
                )}
              </div>
            )}

            {/* Live aggregate */}
            {revealedAnswer && (
              <div className="bg-surface-card rounded-xl p-5 border border-surface-border">
                <AggregateBar aggregate={aggregate} correctAnswer={revealedAnswer.correct} />
              </div>
            )}
          </div>
        )}

        {/* Completed */}
        {session.status === 'completed' && (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
            <h2 className="text-2xl font-bold text-white">Session Complete</h2>
            <button
              onClick={() => navigate(`/session/${session.id}/summary`)}
              className="px-8 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl"
            >
              View Summary →
            </button>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      {isActive && (
        <div className="flex items-center justify-between px-6 py-4 bg-surface-card border-t border-surface-border flex-shrink-0">
          <button
            onClick={handlePrev}
            disabled={qIndex === 0}
            className="px-5 py-2.5 rounded-lg border border-surface-border text-slate-300 disabled:opacity-30 hover:border-slate-500 transition-all"
          >
            ← Prev
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReveal}
              disabled={!!revealedAnswer}
              className="px-8 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-all"
            >
              {revealedAnswer ? '✓ Revealed' : 'Reveal Answer'}
            </button>
            <span className="text-slate-600 text-xs hidden sm:block">
              Space / R
            </span>
          </div>
          <button
            onClick={handleNext}
            disabled={qIndex >= totalQuestions - 1}
            className="px-5 py-2.5 rounded-lg border border-surface-border text-slate-300 disabled:opacity-30 hover:border-slate-500 transition-all"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
