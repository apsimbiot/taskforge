"use client"

import { useEffect, useRef, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

type SSEEventType = "task_updated" | "task_created" | "notification" | "connected"

interface SSEEvent {
  type: SSEEventType
  data: unknown
}

export function useSSE() {
  const queryClient = useQueryClient()
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource("/api/sse")
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log("SSE connected")
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
      
      // Attempt to reconnect after 5 seconds
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null
          connect()
        }, 5000)
      }
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

  return {
    reconnect: connect,
  }
}
