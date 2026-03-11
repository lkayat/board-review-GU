export interface Question {
  id: number
  source: string
  external_id?: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  explanation?: string
  reference?: string
  image_url?: string
  image_frames?: string
  image_type?: string
  is_image_based: boolean
  topic: string
  subtopic?: string
  modality?: string
  difficulty?: string
  tags?: string
  is_active: boolean
  status: string
  created_at: string
}

export interface QuestionPublic {
  id: number
  source: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  image_url?: string
  image_frames?: string
  image_type?: string
  is_image_based: boolean
  topic: string
  subtopic?: string
  modality?: string
  difficulty?: string
  status: string
}

export interface TopicStat {
  topic: string
  label: string
  total: number
  image_based: number
  text_only: number
  basic: number
  intermediate: number
  advanced: number
}

export interface QuestionStats {
  total: number
  topics: TopicStat[]
}
