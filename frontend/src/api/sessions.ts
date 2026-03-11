import { api } from './client'
import type { Session, SessionSummary } from '../types/session'
import type { SessionConfig } from '../types/session'

export const sessionsApi = {
  create: (name: string | undefined, config: SessionConfig) =>
    api.post<Session>('/api/sessions', { name, config }),

  list: () =>
    api.get<Session[]>('/api/sessions'),

  get: (id: number) =>
    api.get<Session>(`/api/sessions/${id}`),

  start: (id: number) =>
    api.patch<Session>(`/api/sessions/${id}/start`),

  advance: (id: number, direction: 'next' | 'prev') =>
    api.patch<Session>(`/api/sessions/${id}/advance`, { direction }),

  reveal: (id: number) =>
    api.patch<Session>(`/api/sessions/${id}/reveal`),

  complete: (id: number) =>
    api.patch<Session>(`/api/sessions/${id}/complete`),

  summary: (id: number) =>
    api.get<SessionSummary>(`/api/sessions/${id}/summary`),

  joinByCode: (code: string) =>
    api.get(`/api/sessions/join/${code}`),
}
