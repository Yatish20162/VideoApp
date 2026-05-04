import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

// const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL

export function useSocket(token) {
  const socketRef = useRef(null)

  useEffect(() => {
    if (!token) return

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      // Authenticate with the server after connect
      socket.emit('authenticate', token)
    })

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler)
    return () => socketRef.current?.off(event, handler)
  }, [])

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler)
  }, [])

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data)
  }, [])

  return { on, off, emit, socket: socketRef }
}