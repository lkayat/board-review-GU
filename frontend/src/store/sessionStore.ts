import { create } from 'zustand'
import type { Session, AggregateOut } from '../types/session'
import type { Question, QuestionPublic } from '../types/question'

interface SessionStore {
  // Current session state (professor)
  session: Session | null
  questions: Question[]
  currentQuestion: Question | QuestionPublic | null
  aggregate: AggregateOut | null
  residentCount: number

  setSession: (s: Session) => void
  setQuestions: (qs: Question[]) => void
  setCurrentQuestion: (q: Question | QuestionPublic | null) => void
  setAggregate: (a: AggregateOut | null) => void
  setResidentCount: (n: number) => void
  reset: () => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  session: null,
  questions: [],
  currentQuestion: null,
  aggregate: null,
  residentCount: 0,

  setSession: (s) => set({ session: s }),
  setQuestions: (qs) => set({ questions: qs }),
  setCurrentQuestion: (q) => set({ currentQuestion: q }),
  setAggregate: (a) => set({ aggregate: a }),
  setResidentCount: (n) => set({ residentCount: n }),
  reset: () => set({ session: null, questions: [], currentQuestion: null, aggregate: null, residentCount: 0 }),
}))
