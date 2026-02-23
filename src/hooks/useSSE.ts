"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

type SSEEventType = "task_updated" | "task_created" | "notification" | "connected"

interface SSEEvent {
  type: SSEEventType
  data: unknown
}

// Debounce to prevent error spam
let errorToastShown = false
const showErrorOnce = (message: string) => {
  if (!errorToastShown) {
    errorToastShown = true
    toast.error("Connection issue", {
      description: "Real-time updates disconnected. Reconnecting...",
      duration: 3000,
    })
    // Reset after 10 seconds to allow showing again if needed
    setTimeout(() => {
      errorToastShown = false
    }, 10000)
  }
}

export function useSSE() {
  const queryClient = useQueryClient()
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const [isConnected, setIsConnected] = useState(false)
  
  // Max reconnect attempts before giving up
  const MAX_RECONNECT_ATTEMPTS = 5

  const connect = useCallback(() => {
    // Don't reconnect if we've exceeded max attempts
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.log("SSE: Max reconnection attempts reached")
      return
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    try {
      const eventSource = new EventSource("/api/sse")
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log("SSE connected")
        setIsConnected(true)
        reconnectAttemptsRef.current = 0 // Reset on successful connection
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("SSE message:", data)
        } catch {
          // Keepalive or non-JSON message
        }
      }

      eventSource.addEventListener("connected", (event) => {
        console.log("SSE connected event:", event)
        setIsConnected(true)
      })

      eventSource.addEventListener("task_updated", (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("Task updated:", data)
          
          // Invalidate task queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["tasks"] })
          
          toast.info("Task updated", {
            description: data.title || "A task was updated",
          })
        } catch (error) {
          console.error("Error parsing task_updated event:", error)
        }
      })

      eventSource.addEventListener("task_created", (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("Task created:", data)
          
          queryClient.invalidateQueries({ queryKey: ["tasks"] })
          
          toast.success("Task created", {
            description: data.title || "A new task was created",
          })
        } catch (error) {
          console.error("Error parsing task_created event:", error)
        }
      })

      eventSource.addEventListener("notification", (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("New notification:", data)
          
          // Invalidate notifications
          queryClient.invalidateQueries({ queryKey: ["notifications"] })
          
          toast(data.type || "info", {
            description: data.message || data.title,
          })
        } catch (error) {
          console.error("Error parsing notification event:", error)
        }
      })

      eventSource.onerror = (error) => {
        console.error("SSE error:", error)
        eventSource.close()
        setIsConnected(false)
        
        // Attempt to reconnect with exponential backoff
        if (!reconnectTimeoutRef.current) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
          reconnectAttemptsRef.current++
          
          console.log(`SSE: Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`)
          
          // Show error toast but debounced to prevent spam
          showErrorOnce("Real-time updates disconnected")
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null
            connect()
          }, delay)
        }
      }
    } catch (error) {
      console.error("SSE: Failed to create EventSource:", error)
    }
  }, [queryClient])

  useEffect(() => {
    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect])

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])

  return {
    reconnect,
    isConnected,
  }
}
