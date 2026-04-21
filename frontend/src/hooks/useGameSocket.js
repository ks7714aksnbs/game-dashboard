import { useEffect, useRef, useCallback, useState } from 'react'

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8080'

export function useGameSocket(sessionCode, onMessage) {
  const ws          = useRef(null)
  const reconnectRef= useRef(null)
  const [status, setStatus] = useState('disconnected') // connecting|open|closed|error

  const connect = useCallback(() => {
    const token = localStorage.getItem('token')
    if (!token || !sessionCode) return

    setStatus('connecting')
    const url = `${WS_BASE}/ws/game/${sessionCode}?token=${token}`
    ws.current = new WebSocket(url)

    ws.current.onopen = () => {
      setStatus('open')
      clearTimeout(reconnectRef.current)
      console.log('[WS] Connected to room:', sessionCode)
    }

    ws.current.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        onMessage?.(msg)
      } catch (err) {
        console.warn('[WS] Bad message:', e.data)
      }
    }

    ws.current.onerror = (e) => {
      setStatus('error')
      console.error('[WS] Error:', e)
    }

    ws.current.onclose = (e) => {
      setStatus('closed')
      console.log('[WS] Closed:', e.code, e.reason)
      // Auto-reconnect unless clean close (code 1000)
      if (e.code !== 1000) {
        reconnectRef.current = setTimeout(connect, 3000)
      }
    }
  }, [sessionCode, onMessage])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectRef.current)
      if (ws.current) {
        ws.current.onclose = null // prevent reconnect on unmount
        ws.current.close(1000, 'Component unmounted')
      }
    }
  }, [connect])

  const send = useCallback((msg) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg))
    } else {
      console.warn('[WS] Not open — message dropped:', msg.type)
    }
  }, [])

  const sendPlayerState = useCallback((state) => {
    send({ type: 'PLAYER_STATE', payload: state })
  }, [send])

  const sendShoot = useCallback((data) => {
    send({ type: 'SHOOT', payload: data })
  }, [send])

  const sendGameEvent = useCallback((data) => {
    send({ type: 'GAME_EVENT', payload: data })
  }, [send])

  return { send, sendPlayerState, sendShoot, sendGameEvent, status }
}
