import { api } from './client'
import type { Question, QuestionStats } from '../types/question'

export const questionsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Question[]>('/api/questions', { params }),

  stats: () =>
    api.get<QuestionStats>('/api/questions/stats'),

  all: (params?: Record<string, unknown>) =>
    api.get<Question[]>('/api/questions/all', { params }),

  drafts: () =>
    api.get<Question[]>('/api/questions/drafts'),

  pending: () =>
    api.get<Question[]>('/api/questions/pending'),

  pendingCount: () =>
    api.get<{ count: number }>('/api/questions/pending-count'),

  get: (id: number) =>
    api.get<Question>(`/api/questions/${id}`),

  update: (id: number, data: Partial<Question>) =>
    api.patch<Question>(`/api/questions/${id}`, data),

  activate: (id: number) =>
    api.patch<Question>(`/api/questions/${id}/activate`),

  deactivate: (id: number) =>
    api.patch<Question>(`/api/questions/${id}/deactivate`),

  submitReview: (id: number) =>
    api.patch<Question>(`/api/questions/${id}/submit-review`),

  delete: (id: number) =>
    api.delete(`/api/questions/${id}`),

  generate: (params: {
    topic: string
    difficulty: string
    count: number
    subtopic?: string
    modality?: string
    keywords?: string
  }) => api.post<Question[]>('/api/questions/generate', params),

  importJson: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ inserted: number; total_submitted: number }>(
      '/api/content/import-json',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
  },
}
