import { Routes, Route, Navigate } from 'react-router-dom'
import SessionBuilderPage from './pages/SessionBuilderPage'
import ResidentJoinPage from './pages/ResidentJoinPage'

// Placeholder pages for sprints 2+
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-brand-500 mb-2">{title}</h1>
      <p className="text-slate-400">Coming in Sprint 2+</p>
    </div>
  </div>
)

export default function App() {
  return (
    <Routes>
      {/* Professor routes */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<PlaceholderPage title="Professor Dashboard" />} />
      <Route path="/session/new" element={<SessionBuilderPage />} />
      <Route path="/session/:id/present" element={<PlaceholderPage title="Session Presentation" />} />
      <Route path="/session/:id/summary" element={<PlaceholderPage title="Session Summary" />} />

      {/* Resident routes (public) */}
      <Route path="/join" element={<ResidentJoinPage />} />
      <Route path="/join/:code" element={<ResidentJoinPage />} />
      <Route path="/session/:code/resident" element={<PlaceholderPage title="Resident Session" />} />
    </Routes>
  )
}
