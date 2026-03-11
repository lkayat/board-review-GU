import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionsApi } from '../api/sessions'
import { answersApi } from '../api/answers'
import { useSessionSocket } from '../hooks/useSessionSocket'

interface ResidentQuestion {
  id: number
  question_text: string
  option_a: string; option_b: string; option_c: string; option_d: string
  is_image_based: boolean
  image_url?: string; image_type?: string
  correct_answer?: string
  explanation?: string
  topic?: string
}

export default function ResidentSessionPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const sessionCode = code?.toUpperCase() || ''

  const [status, setStatus] = useState<'loading' | 'waiting' | 'active' | 'ended'>('loading')
  const [currentQuestion, setCurrentQuestion] = useState<ResidentQuestion | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // Load initial session state
  useEffect(() => {
    if (!sessionCode) return
    sessionsApi.joinByCode(sessionCode)
      .then((res) => {
        const data = res.data
        if (data.status === 'completed') {
          setStatus('ended')
        } else if (data.status === 'active' && data.current_question) {
          setCurrentQuestion(data.current_question as ResidentQuestion)
          setQuestionIndex(data.current_index)
          setTotalQuestions(data.total_questions)
          setIsRevealed(data.is_revealed)
          setStatus('active')
        } else {
          setStatus('waiting')
          setTotalQuestions(data.total_questions)
        }
      })
      .catch(() => setError('Session not found. Check the code and try again.'))
  }, [sessionCode])

  // WS handlers
  const handleQuestionChanged = useCallback((msg: { data: { index: number; total: number; question: unknown; is_revealed: boolean } }) => {
    setCurrentQuestion(msg.data.question as ResidentQuestion)
    setQuestionIndex(msg.data.index)
    setTotalQuestions(msg.data.total)
    setIsRevealed(msg.data.is_revealed)
    setSelectedChoice(null)
    setSubmitted(false)
    setStatus('active')
  }, [])

  const handleAnswerRevealed = useCallback((msg: { data: { correct: string; explanation?: string } }) => {
    setIsRevealed(true)
    setCurrentQuestion((prev) => prev ? {
      ...prev,
      correct_answer: msg.data.correct,
      explanation: msg.data.explanation,
    } : prev)
  }, [])

  const handleSessionEnded = useCallback(() => {
    setStatus('ended')
  }, [])

  useSessionSocket({
    sessionCode,
    role: 'resident',
    onQuestionChanged: handleQuestionChanged,
    onAnswerRevealed: handleAnswerRevealed,
    onSessionEnded: handleSessionEnded,
  })

  const handleSubmit = async (choice: string) => {
    if (submitted || isRevealed) return
    setSelectedChoice(choice)
    setSubmitted(true)
    try {
      await answersApi.submit(sessionCode, questionIndex, choice)
    } catch {
      setSubmitted(false)
      setSelectedChoice(null)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => navigate('/join')} className="text-brand-500 underline">Try again</button>
        </div>
      </div>
    )
  }

  if (status === 'loading') {
    return <div className="min-h-screen bg-surface flex items-center justify-center text-slate-400">Connecting...</div>
  }

  if (status === 'waiting') {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-5xl animate-pulse">🩻</div>
        <h2 className="text-2xl font-bold text-white">You're in!</h2>
        <p className="text-slate-400 text-center">Waiting for the professor to start the session...</p>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        {sessionCode && <p className="text-slate-600 font-mono text-sm mt-4">Session: {sessionCode}</p>}
      </div>
    )
  }

  if (status === 'ended') {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-5xl">✅</div>
        <h2 className="text-2xl font-bold text-white">Session ended</h2>
        <p className="text-slate-400">Thanks for participating!</p>
        <button onClick={() => navigate('/join')} className="mt-2 text-brand-500 underline text-sm">Join another session</button>
      </div>
    )
  }

  if (!currentQuestion) return null

  const choices = [
    { key: 'A', text: currentQuestion.option_a },
    { key: 'B', text: currentQuestion.option_b },
    { key: 'C', text: currentQuestion.option_c },
    { key: 'D', text: currentQuestion.option_d },
  ]

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Progress */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>Q {questionIndex + 1} / {totalQuestions}</span>
          <span>{sessionCode}</span>
        </div>
        <div className="w-full bg-surface-border rounded-full h-1">
          <div
            className="bg-brand-500 h-1 rounded-full transition-all"
            style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Question text */}
        <div className="bg-surface-card rounded-xl p-5 border border-surface-border">
          <p className="text-white leading-relaxed">{currentQuestion.question_text}</p>
        </div>

        {/* Choices */}
        <div className="space-y-3">
          {choices.map(({ key, text }) => {
            const isSelected = selectedChoice === key
            const isCorrect = isRevealed && currentQuestion.correct_answer === key
            const isWrongSelected = isRevealed && isSelected && !isCorrect

            let style = 'border-surface-border bg-surface-card text-slate-200'
            if (isCorrect) style = 'border-green-500 bg-green-900/20 text-green-200'
            else if (isWrongSelected) style = 'border-red-500 bg-red-900/20 text-red-300'
            else if (isSelected && !isRevealed) style = 'border-brand-500 bg-brand-900/20 text-white'

            return (
              <button
                key={key}
                onClick={() => handleSubmit(key)}
                disabled={submitted || isRevealed}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all disabled:cursor-default ${style}`}
              >
                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold flex-shrink-0 ${
                  isCorrect ? 'bg-green-500 text-white' : isWrongSelected ? 'bg-red-500 text-white' : isSelected ? 'bg-brand-500 text-white' : 'bg-surface-border text-slate-400'
                }`}>
                  {key}
                </span>
                <span className="text-sm">{text}</span>
                {isCorrect && <span className="ml-auto text-green-400">✓</span>}
                {isWrongSelected && <span className="ml-auto text-red-400">✗</span>}
              </button>
            )
          })}
        </div>

        {/* Submitted but waiting for reveal */}
        {submitted && !isRevealed && (
          <div className="text-center text-slate-400 text-sm py-2 animate-pulse">
            Answer submitted · waiting for professor to reveal...
          </div>
        )}

        {/* Explanation after reveal */}
        {isRevealed && currentQuestion.explanation && (
          <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-5">
            <p className="text-green-400 text-sm font-medium mb-2">Teaching Point</p>
            <p className="text-slate-200 text-sm leading-relaxed">{currentQuestion.explanation}</p>
          </div>
        )}
      </div>
    </div>
  )
}
