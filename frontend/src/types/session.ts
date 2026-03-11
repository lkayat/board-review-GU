export interface SessionConfig {
  topics: string[]
  modalities?: string[]
  difficulty?: string
  n_questions: number
  image_pct: number
  timer_seconds?: number
}

export interface Session {
  id: number
  code: string
  name?: string
  status: 'building' | 'active' | 'paused' | 'completed'
  config?: string
  question_ids?: string
  current_index: number
  is_revealed: boolean
  total_respondents: number
  created_at: string
  started_at?: string
  completed_at?: string
}

export interface AggregateOut {
  session_id: number
  question_id: number
  question_index: number
  count_a: number
  count_b: number
  count_c: number
  count_d: number
  total_responses: number
  choices: { choice: string; count: number; pct: number }[]
}

export interface TopicSummary {
  topic: string
  label: string
  total_questions: number
  correct_count: number
  pct_correct: number
}

export interface QuestionReview {
  question_index: number
  question_text: string
  correct_answer: string
  explanation?: string
  aggregate?: AggregateOut
  resident_pct_correct: number
}

export interface SessionSummary {
  session_id: number
  session_name?: string
  total_questions: number
  overall_pct_correct: number
  topics: TopicSummary[]
  questions: QuestionReview[]
}
