"use client"

import { useState, useEffect } from "react"
import { Play, Pause, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface TimeTrackerProps {
  taskId?: string
  onTimeUpdate?: (seconds: number) => void
  className?: string
}

export function TimeTracker({ taskId, onTimeUpdate, className }: TimeTrackerProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [intervalId])

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  const handleStart = () => {
    setIsRunning(true)
    const id = setInterval(() => {
      setSeconds((prev) => {
        const newValue = prev + 1
        if (onTimeUpdate) {
          onTimeUpdate(newValue)
        }
        return newValue
      })
    }, 1000)
    setIntervalId(id)
  }

  const handlePause = () => {
    setIsRunning(false)
    if (intervalId) {
      clearInterval(intervalId)
      setIntervalId(null)
    }
  }

  const handleStop = () => {
    handlePause()
    setSeconds(0)
    if (onTimeUpdate) {
      onTimeUpdate(0)
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-sm font-mono min-w-[80px] justify-center">
        <span className={cn("text-lg", isRunning && "text-status-green")}>
          {formatTime(seconds)}
        </span>
      </div>
      
      {isRunning ? (
        <Button
          variant="outline"
          size="icon"
          onClick={handlePause}
          className="h-8 w-8"
        >
          <Pause className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="icon"
          onClick={handleStart}
          className="h-8 w-8"
        >
          <Play className="h-4 w-4" />
        </Button>
      )}
      
      <Button
        variant="outline"
        size="icon"
        onClick={handleStop}
        className="h-8 w-8"
      >
        <Square className="h-4 w-4" />
      </Button>
    </div>
  )
}
