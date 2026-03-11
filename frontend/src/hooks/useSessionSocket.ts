import { useEffect, useRef, useCallback } from 'react'
import { useSessionStore } from '../store/sessionStore'
import type { AggregateOut } from '../types/session'

const WS_BASE = import.meta.env.VITE_WS_URL || ''

type WsEvent =
  | { event: 'session_started'; data: { code: string } }
  | { event: 'question_changed'; data: { index: number; total: number; question: unknown; is_revealed: boolean } }
  | { event: 'answer_revealed'; data: { correct: string; explanation: string; reference?: string; aggregate: AggregateOut | null } }
  | { event: 'aggregate_update'; data: { aggregate: AggregateOut } }
  | { event: 'timer_tick'; data: { remaining_seconds: number } }
  | { event: 'session_ended'; data: { summary_url: string } }
  | { event: 'resident_joined'; data: { count: number } }
  | { event: 'waiting'; data: { message: string } }
  | { event: 'pong' }

interface UseSessionSocketOptions {
  sessionCode: string
  role: 'professor' | 'resident'
  onQuestionChanged?: (data: WsEvent & { event: 'question_changed' }) => void
  onAnswerRevealed?: (data: WsEvent & { event: 'answer_revealed' }) => void
  onSessionEnded?: (summaryUrl: string) => void
  onTimerTick?: (remaining: number) => void
}

export function useSessionSocket({
  sessionCode,
  role,
  onQuestionChanged,
  onAnswerRevealed,
  onSessionEnded,
  onTimerTick,
}: UseSessionSocketOptions) {
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setAggregate = useSessionStore((s) => s.setAggregate)
  const setResidentCount = useSessionStore((s) => s.setResidentCount)

  const connect = useCallback(() => {
    if (!sessionCode) return
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const base = WS_BASE || `${protocol}://${window.location.host}`
    const url = `${base}/ws/session/${sessionCode}?role=${role}`

    const socket = new WebSocket(url)
    ws.current = socket

    socket.onopen = () => {
      console.log(`[WS] Connected to session ${sessionCode} as ${role}`)
    }

    socket.onmessage = (event) => {
      try {
        const msg: WsEvent = JSON.parse(event.data)
        switch (msg.event) {
          case 'question_changed':
            onQuestionChanged?.(msg as WsEvent & { event: 'question_changed' })
            break
          case 'answer_revealed':
            onAnswerRevealed?.(msg as WsEvent & { event: 'answer_revealed' })
            if (msg.data.aggregate) setAggregate(msg.data.aggregate)
            break
          case 'aggregate_update':
            setAggregate(msg.data.aggregate)
            break
          case 'timer_tick':
            onTimerTick?.(msg.data.remaining_seconds)
            break
          case 'session_ended':
            onSessionEnded?.(msg.data.summary_url)
            break
          case 'resident_joined':
            setResidentCount(msg.data.count)
            break
        }
      } catch {
        // ignore malformed messages
      }
    }

    socket.onclose = () => {
      console.log('[WS] Disconnected — reconnecting in 3s...')
      reconnectTimer.current = setTimeout(connect, 3000)
    }

    socket.onerror = (err) => {
      console.error('[WS] Error:', err)
      socket.close()
    }
  }, [sessionCode, role])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [connect])

  const sendPing = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ event: 'ping' }))
    }
  }, [])

  return { sendPing }
}
