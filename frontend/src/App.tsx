import { Routes, Route, Navigate } from 'react-router-dom'
import SessionBuilderPage from './pages/SessionBuilderPage'
import ResidentJoinPage from './pages/ResidentJoinPage'
import PresentationPage from './pages/PresentationPage'
import SummaryPage from './pages/SummaryPage'
import ProfessorDashboard from './pages/ProfessorDashboard'
import ResidentSessionPage from './pages/ResidentSessionPage'
import QuestionReviewPage from './pages/QuestionReviewPage'
import QuestionBankPage from './pages/QuestionBankPage'

export default function App() {
  return (
    <Routes>
      {/* Professor routes */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProfessorDashboard />} />
      <Route path="/session/new" element={<SessionBuilderPage />} />
      <Route path="/session/:id/present" element={<PresentationPage />} />
      <Route path="/session/:id/summary" element={<SummaryPage />} />

      {/* Resident routes (public) */}
      <Route path="/join" element={<ResidentJoinPage />} />
      <Route path="/join/:code" element={<ResidentJoinPage />} />
      <Route path="/session/:code/resident" element={<ResidentSessionPage />} />

      {/* Question management */}
      <Route path="/questions/bank" element={<QuestionBankPage />} />
      <Route path="/questions/drafts" element={<QuestionReviewPage />} />
    </Routes>
  )
}
