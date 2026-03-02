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
  differenceInCalendarDays,
  max as dateMax,
  min as dateMin,
  startOfDay,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { TaskResponse } from "@/lib/api"

interface CalendarViewProps {
  tasks: TaskResponse[]
  onTaskClick: (taskId: string) => void
}

const PRIORITY_BG: Record<string, string> = {
  urgent: "bg-red-500/90 hover:bg-red-500",
  high: "bg-orange-500/90 hover:bg-orange-500",
  medium: "bg-yellow-500/90 hover:bg-yellow-500",
  low: "bg-green-500/80 hover:bg-green-500",
  none: "bg-muted-foreground/60 hover:bg-muted-foreground/80",
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
  none: "bg-muted-foreground",
}

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0, high: 1, medium: 2, low: 3, none: 4,
}

type CalendarTask = {
  id: string
  title: string
  start: Date
  end: Date
  isMultiDay: boolean
  priority: string
  status: string | null
}

type WeekSegment = {
  task: CalendarTask
  startCol: number
  span: number
  isStart: boolean
  isEnd: boolean
  lane: number
}

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const calendarDays = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart.getTime(), calendarEnd.getTime()]
  )

  const weeks = useMemo(() => {
    const result: Date[][] = []
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7))
    }
    return result
  }, [calendarDays])

  const calendarTasks = useMemo(() => {
    return tasks
      .filter((t) => t.dueDate || t.startDate)
      .map((t): CalendarTask => {
        const due = t.dueDate ? startOfDay(new Date(t.dueDate)) : null
        const start = t.startDate ? startOfDay(new Date(t.startDate)) : null
        const effectiveStart = start || due!
        const effectiveEnd = due || start!
        // Ensure start <= end
        const realStart = effectiveStart <= effectiveEnd ? effectiveStart : effectiveEnd
        const realEnd = effectiveStart <= effectiveEnd ? effectiveEnd : effectiveStart
        return {
          id: t.id,
          title: t.title,
          start: realStart,
          end: realEnd,
          isMultiDay: differenceInCalendarDays(realEnd, realStart) > 0,
          priority: t.priority || "none",
          status: t.status,
        }
      })
      .sort((a, b) => {
        // Longer tasks first, then by priority, then alphabetical
        const dur = differenceInCalendarDays(b.end, b.start) - differenceInCalendarDays(a.end, a.start)
        if (dur !== 0) return dur
        const pri = (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4)
        if (pri !== 0) return pri
        return a.title.localeCompare(b.title)
      })
  }, [tasks])

  const weekData = useMemo(() => {
    return weeks.map((weekDays) => {
      const weekStart = weekDays[0]
      const weekEnd = weekDays[6]

      // Multi-day segments with lane assignment
      const multiDaySegments: WeekSegment[] = []
      // lanes[i] tracks which columns are occupied in lane i
      const lanes: boolean[][] = []

      calendarTasks
        .filter((t) => t.isMultiDay && t.start <= weekEnd && t.end >= weekStart)
        .forEach((task) => {
          const segStart = dateMax([task.start, weekStart])
          const segEnd = dateMin([task.end, weekEnd])
          const startCol = differenceInCalendarDays(segStart, weekStart)
          const span = differenceInCalendarDays(segEnd, segStart) + 1
          const isStart = isSameDay(segStart, task.start)
          const isEnd = isSameDay(segEnd, task.end)

          // Find first lane where columns startCol..startCol+span-1 are free
          let lane = -1
          for (let l = 0; l < lanes.length; l++) {
            let free = true
            for (let c = startCol; c < startCol + span; c++) {
              if (lanes[l][c]) { free = false; break }
            }
            if (free) { lane = l; break }
          }
          if (lane === -1) {
            lane = lanes.length
            lanes.push(new Array(7).fill(false))
          }
          // Mark columns as occupied
          for (let c = startCol; c < startCol + span; c++) {
            lanes[lane][c] = true
          }

          multiDaySegments.push({ task, startCol, span, isStart, isEnd, lane })
        })

      // Single-day tasks by date
      const singleDayByDate: Record<string, CalendarTask[]> = {}
      calendarTasks
        .filter((t) => !t.isMultiDay && t.start >= weekStart && t.start <= weekEnd)
        .forEach((task) => {
          const key = format(task.start, "yyyy-MM-dd")
          if (!singleDayByDate[key]) singleDayByDate[key] = []
          singleDayByDate[key].push(task)
        })

      return { weekDays, multiDaySegments, laneCount: lanes.length, singleDayByDate }
    })
  }, [weeks, calendarTasks])

  const BAR_HEIGHT = 20
  const BAR_GAP = 2
  const BAR_AREA_PADDING = 2

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">{format(currentDate, "MMMM yyyy")}</h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate((d) => subMonths(d, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate((d) => addMonths(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">Priority:</span>
          {[
            { label: "Urgent", color: "bg-red-500" },
            { label: "High", color: "bg-orange-500" },
            { label: "Medium", color: "bg-yellow-500" },
            { label: "Low", color: "bg-green-500" },
          ].map((p) => (
            <span key={p.label} className="flex items-center gap-1">
              <span className={cn("w-2.5 h-2.5 rounded-full", p.color)} />
              {p.label}
            </span>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-auto p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Week rows */}
        {weekData.map((week, weekIdx) => {
          const barAreaH = week.laneCount > 0
            ? week.laneCount * (BAR_HEIGHT + BAR_GAP) + BAR_AREA_PADDING
            : 0

          return (
            <div key={weekIdx} className="relative">
              {/* Day cells */}
              <div className="grid grid-cols-7">
                {week.weekDays.map((day, colIdx) => {
                  const dateKey = format(day, "yyyy-MM-dd")
                  const isCurrentMonth = isSameMonth(day, currentDate)
                  const isDayToday = isToday(day)
                  const singleTasks = week.singleDayByDate[dateKey] || []

                  return (
                    <div
                      key={dateKey}
                      className={cn(
                        "min-h-[100px] border border-border/30 px-1 pt-1 pb-1 flex flex-col",
                        isCurrentMonth ? "bg-background" : "bg-muted/10",
                        isDayToday && "ring-2 ring-primary ring-inset"
                      )}
                    >
                      {/* Day number */}
                      <div className={cn(
                        "text-xs font-medium px-0.5",
                        !isCurrentMonth && "text-muted-foreground/40",
                        isDayToday && "text-primary font-bold"
                      )}>
                        {format(day, "d")}
                      </div>

                      {/* Spacer for multi-day bars */}
                      {barAreaH > 0 && <div style={{ height: `${barAreaH}px` }} className="flex-shrink-0" />}

                      {/* Single-day tasks */}
                      <div className="flex-1 overflow-y-auto space-y-0.5 mt-0.5">
                        {singleTasks.slice(0, 3).map((task) => (
                          <button
                            key={task.id}
                            onClick={() => onTaskClick(task.id)}
                            className="w-full text-left text-[11px] px-1.5 py-0.5 rounded bg-muted/50 hover:bg-muted transition-colors flex items-center gap-1.5 truncate"
                            title={task.title}
                          >
                            <span className={cn("w-2 h-2 rounded-full flex-shrink-0", PRIORITY_DOT[task.priority])} />
                            <span className="truncate">{task.title}</span>
                          </button>
                        ))}
                        {singleTasks.length > 3 && (
                          <div className="text-[10px] text-muted-foreground px-1">+{singleTasks.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Multi-day bars overlay — positioned absolutely over the week row */}
              {week.multiDaySegments.map((seg) => {
                // Position: offset from the day number row (~20px from top of cell)
                const top = 20 + BAR_AREA_PADDING + seg.lane * (BAR_HEIGHT + BAR_GAP)
                const leftPct = (seg.startCol / 7) * 100
                const widthPct = (seg.span / 7) * 100

                return (
                  <button
                    key={`${seg.task.id}-w${weekIdx}`}
                    onClick={() => onTaskClick(seg.task.id)}
                    className={cn(
                      "absolute text-[11px] font-medium text-white truncate px-2 flex items-center cursor-pointer transition-all z-10",
                      PRIORITY_BG[seg.task.priority],
                      seg.isStart && seg.isEnd && "rounded-md",
                      seg.isStart && !seg.isEnd && "rounded-l-md",
                      !seg.isStart && seg.isEnd && "rounded-r-md",
                      !seg.isStart && !seg.isEnd && "rounded-none"
                    )}
                    style={{
                      top: `${top}px`,
                      left: `calc(${leftPct}% + 3px)`,
                      width: `calc(${widthPct}% - 6px)`,
                      height: `${BAR_HEIGHT}px`,
                    }}
                    title={`${seg.task.title} (${format(seg.task.start, "MMM d")} → ${format(seg.task.end, "MMM d")})`}
                  >
                    {seg.isStart ? seg.task.title : ""}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
