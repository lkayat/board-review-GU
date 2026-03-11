import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function ResidentJoinPage() {
  const { code: urlCode } = useParams<{ code?: string }>()
  const navigate = useNavigate()
  const [code, setCode] = useState(urlCode?.toUpperCase() || '')
  const [error, setError] = useState('')

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length < 4) {
      setError('Please enter a valid session code.')
      return
    }
    navigate(`/session/${trimmed}/resident`)
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-900/50 rounded-2xl mb-4 border border-brand-500/30">
            <span className="text-3xl">🩻</span>
          </div>
          <h1 className="text-3xl font-bold text-white">GU Board Review</h1>
          <p className="text-slate-400 mt-1">Enter your session code to join</p>
        </div>

        <div className="bg-surface-card rounded-2xl border border-surface-border p-8">
          <form onSubmit={handleJoin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Session Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase().slice(0, 8))
                  setError('')
                }}
                placeholder="e.g. RK7X2P"
                autoFocus
                className="w-full bg-surface border border-surface-border rounded-xl px-4 py-4 text-white text-2xl font-mono text-center tracking-widest placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-all text-lg"
            >
              Join Session →
            </button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Get the code from the professor's screen or scan the QR code
        </p>
      </div>
    </div>
  )
}
