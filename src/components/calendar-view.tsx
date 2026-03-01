"use client"

import React, { useState, useMemo } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { TaskResponse } from "@/lib/api"

type CalendarEvent = {
  id: string
  title: string
  dueDate: string
  priority: string | null
  status: string | null
}

interface CalendarViewProps {
  tasks: TaskResponse[]
  onTaskClick: (taskId: string) => void
}

// Priority colors
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500 border-red-600 text-white",
  high: "bg-orange-500 border-orange-600 text-white",
  medium: "bg-yellow-500 border-yellow-600 text-white",
  low: "bg-green-500 border-green-600 text-white",
  none: "bg-gray-400 border-gray-500 text-white",
}

// Priority order for sorting
const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
}

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  // Transform tasks into calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return tasks
      .filter((task) => task.dueDate)
      .map((task) => ({
        id: task.id,
        title: task.title,
        dueDate: task.dueDate!,
        priority: task.priority,
        status: task.status,
      }))
      .sort((a, b) => {
        const priorityA = PRIORITY_ORDER[a.priority || "none"] ?? 4
        const priorityB = PRIORITY_ORDER[b.priority || "none"] ?? 4
        return priorityA - priorityB
      })
  }, [tasks])

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {}
    events.forEach((event) => {
      const dateKey = format(new Date(event.dueDate), "yyyy-MM-dd")
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(event)
    })
    return grouped
  }, [events])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  const handlePrevMonth = () => {
    setCurrentDate((prev) => subMonths(prev, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate((prev) => addMonths(prev, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  return (
    <div className="flex flex-col h-full">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">Priority:</span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              Urgent
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              High
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              Medium
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              Low
            </span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1 auto-rows-fr min-h-0">
          {calendarDays.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd")
            const dayEvents = eventsByDate[dateKey] || []
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isDayToday = isToday(day)

            return (
              <div
                key={dateKey}
                className={`
                  min-h-[100px] border rounded-md p-1 flex flex-col
                  ${isCurrentMonth ? "bg-background" : "bg-muted/20"}
                  ${isDayToday ? "ring-2 ring-primary" : ""}
                `}
              >
                {/* Day number */}
                <div
                  className={`
                    text-xs font-medium mb-1 px-1
                    ${!isCurrentMonth ? "text-muted-foreground/50" : ""}
                    ${isDayToday ? "text-primary font-bold" : ""}
                  `}
                >
                  {format(day, "d")}
                </div>

                {/* Events */}
                <div className="flex-1 overflow-y-auto space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <button
                      key={event.id}
                      onClick={() => onTaskClick(event.id)}
                      className={`
                        w-full text-left text-xs px-1.5 py-0.5 rounded truncate
                        border-l-2
                        ${PRIORITY_COLORS[event.priority || "none"]}
                      `}
                      title={event.title}
                    >
                      {event.title}
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground px-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
