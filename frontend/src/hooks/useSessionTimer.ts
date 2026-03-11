import { useState, useEffect, useRef, useCallback } from 'react'

export function useSessionTimer(initialSeconds: number, onExpire?: () => void) {
  const [remaining, setRemaining] = useState(initialSeconds)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [running, setRunning] = useState(false)

  const start = useCallback(() => {
    setRunning(true)
  }, [])

  const stop = useCallback(() => {
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const reset = useCallback((seconds?: number) => {
    stop()
    setRemaining(seconds ?? initialSeconds)
  }, [initialSeconds, stop])

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          stop()
          onExpire?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, stop, onExpire])

  const pct = initialSeconds > 0 ? (remaining / initialSeconds) * 100 : 0

  return { remaining, running, pct, start, stop, reset }
}
