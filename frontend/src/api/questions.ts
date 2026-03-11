import { api } from './client'
import type { Question, QuestionStats } from '../types/question'

export const questionsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Question[]>('/api/questions', { params }),

  stats: () =>
    api.get<QuestionStats>('/api/questions/stats'),

  drafts: () =>
    api.get<Question[]>('/api/questions/drafts'),

  get: (id: number) =>
    api.get<Question>(`/api/questions/${id}`),

  update: (id: number, data: Partial<Question>) =>
    api.patch<Question>(`/api/questions/${id}`, data),

  activate: (id: number) =>
    api.patch<Question>(`/api/questions/${id}/activate`),

  delete: (id: number) =>
    api.delete(`/api/questions/${id}`),

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
