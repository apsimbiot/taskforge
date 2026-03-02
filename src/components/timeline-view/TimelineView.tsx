"use client"

import React, { useMemo, useState, useRef } from "react"
import { format, parseISO, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays, isToday } from "date-fns"
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { TaskResponse } from "@/lib/api"

interface TimelineViewProps {
  tasks: TaskResponse[]
  onTaskUpdate: (taskId: string, dueDate: string | undefined) => void
  onTaskClick?: (taskId: string) => void
  groupBy?: "status" | "priority" | null
  statuses?: { value: string; label: string; color: string }[]
}

type TimelineZoom = "Day" | "Week" | "Month"

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  todo: { bg: "#6b7280", border: "#9ca3af", text: "#ffffff" },
  in_progress: { bg: "#3b82f6", border: "#60a5fa", text: "#ffffff" },
  review: { bg: "#eab308", border: "#facc15", text: "#000000" },
  done: { bg: "#22c55e", border: "#4ade80", text: "#ffffff" },
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#FF6B35",
  medium: "#eab308",
  low: "#22c55e",
  none: "#94a3b8",
}

interface TaskBarData {
  id: string
  title: string
  start: Date
  end: Date
  status: string
  priority: string
  progress: number
}

function convertToTaskBar(task: TaskResponse): TaskBarData | null {
  if (!task.dueDate && !task.createdAt) return null
  
  const startDate = task.createdAt ? parseISO(task.createdAt) : new Date()
  let endDate = task.dueDate ? parseISO(task.dueDate) : addDays(startDate, 7)

  if (endDate < startDate) {
    endDate = addDays(startDate, 1)
  }

  const taskStatus = task.status || "todo"
  const taskPriority = task.priority || "none"
  const progress = taskStatus === "done" ? 100 : taskStatus === "review" ? 75 : taskStatus === "in_progress" ? 50 : 0

  return {
    id: task.id,
    title: task.title || "Untitled Task",
    start: startDate,
    end: endDate,
    status: taskStatus,
    priority: taskPriority,
    progress: progress,
  }
}

export function TimelineView(props: TimelineViewProps) {
  const { tasks, onTaskUpdate, onTaskClick } = props
  const [zoom, setZoom] = useState<TimelineZoom>("Week")
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const dayWidth = zoom === "Day" ? 80 : zoom === "Week" ? 40 : 20

  const timelineData = useMemo(() => {
    const now = new Date()
    let rangeStart: Date, rangeEnd: Date

    const validTasks = tasks.map(convertToTaskBar).filter((t): t is TaskBarData => t !== null)
    const starts = validTasks.map(t => t.start.getTime())
    const ends = validTasks.map(t => t.end.getTime())

    if (validTasks.length > 0) {
      const min = new Date(Math.min(...starts))
      const max = new Date(Math.max(...ends))
      
      if (zoom === "Day") {
        rangeStart = addDays(min, -3)
        rangeEnd = addDays(max, 14)
      } else if (zoom === "Week") {
        rangeStart = addDays(startOfWeek(min), -7)
        rangeEnd = addDays(endOfWeek(max), 14)
      } else {
        rangeStart = addDays(startOfMonth(min), -14)
        rangeEnd = addDays(endOfMonth(max), 30)
      }
    } else {
      rangeStart = addDays(startOfWeek(now), -7)
      rangeEnd = addDays(endOfWeek(now), 14)
    }

    const allDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd })

    return {
      start: rangeStart,
      end: rangeEnd,
      days: allDays,
      taskBars: validTasks.sort((a, b) => a.start.getTime() - b.start.getTime())
    }
  }, [tasks, zoom])

  const taskStats = useMemo(() => {
    const now = new Date()
    return {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === "done").length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      overdue: tasks.filter((t) => t.dueDate && parseISO(t.dueDate) < now && t.status !== "done").length,
    }
  }, [tasks])

  function getBarPosition(task: TaskBarData) {
    const offset = differenceInDays(task.start, timelineData.start)
    const duration = differenceInDays(task.end, task.start) + 1
    return {
      left: offset * dayWidth,
      width: Math.max(duration * dayWidth, dayWidth),
    }
  }

  function onMouseMove(e: React.MouseEvent, taskId: string) {
    setHoveredTaskId(taskId)
    setTooltipPosition({ x: e.clientX, y: e.clientY })
  }

  function onMouseLeave() {
    setHoveredTaskId(null)
    setTooltipPosition(null)
  }

  function onTaskSelect(taskId: string) {
    onTaskClick?.(taskId)
  }

  if (!tasks.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No tasks to display</h3>
        <p className="text-sm text-muted-foreground">Create tasks with due dates to see them on the timeline.</p>
      </div>
    )
  }

  const totalWidth = timelineData.days.length * dayWidth
  const hoveredTask = timelineData.taskBars.find(t => t.id === hoveredTaskId)

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            {(["Day", "Week", "Month"] as TimelineZoom[]).map((z) => (
              <Button
                key={z}
                variant={zoom === z ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-3 text-xs font-medium"
                onClick={() => setZoom(z)}
              >
                {z}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">Today</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{taskStats.total}</span> tasks
          </span>
          {taskStats.completed > 0 && (
            <Badge variant="outline" className="h-5 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 text-[11px]">
              {taskStats.completed} done
            </Badge>
          )}
          {taskStats.inProgress > 0 && (
            <Badge variant="outline" className="h-5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-[11px]">
              {taskStats.inProgress} active
            </Badge>
          )}
          {taskStats.overdue > 0 && (
            <Badge variant="outline" className="h-5 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 text-[11px]">
              {taskStats.overdue} overdue
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden" ref={timelineRef}>
        <div className="w-64 flex-shrink-0 border-r bg-muted/20 overflow-y-auto">
          <div className="h-14 flex items-center px-4 border-b bg-muted/30">
            <span className="text-sm font-medium text-muted-foreground">Tasks</span>
          </div>
          <div className="divide-y divide-border">
            {timelineData.taskBars.map((task) => {
              const colors = STATUS_COLORS[task.status] || STATUS_COLORS.todo
              return (
                <div
                  key={task.id}
                  className="h-12 flex items-center px-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onTaskSelect(task.id)}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mr-3" style={{ backgroundColor: colors.bg }} />
                  <span className="text-sm truncate text-foreground">{task.title}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div style={{ minWidth: totalWidth }}>
            <div className="h-14 flex border-b bg-muted/30 sticky top-0 z-10">
              {timelineData.days.map((day, idx) => {
                const isWeekend = day.getDay() === 0 || day.getDay() === 6
                const isTodayDay = isToday(day)
                return (
                  <div
                    key={idx}
                    className={cn("flex-shrink-0 flex flex-col items-center justify-center border-r border-border/50", isWeekend && "bg-muted/20", isTodayDay && "bg-orange-500/10")}
                    style={{ width: dayWidth }}
                  >
                    <span className={cn("text-[10px] uppercase font-medium", isTodayDay ? "text-orange-500" : "text-muted-foreground")}>
                      {format(day, "EEE")}
                    </span>
                    <span className={cn("text-sm font-semibold", isTodayDay ? "text-orange-500" : "text-foreground")}>
                      {format(day, "d")}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex">
                {timelineData.days.map((day, idx) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6
                  return (
                    <div key={idx} className={cn("flex-shrink-0 border-r border-border/30", isWeekend && "bg-muted/10")} style={{ width: dayWidth }} />
                  )
                })}
              </div>

              {timelineData.days.some(d => isToday(d)) && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-orange-500 z-20" style={{ left: differenceInDays(new Date(), timelineData.start) * dayWidth + dayWidth / 2 }} />
              )}

              <div className="relative">
                {timelineData.taskBars.map((task, index) => {
                  const pos = getBarPosition(task)
                  const colors = STATUS_COLORS[task.status] || STATUS_COLORS.todo
                  const pColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.none

                  return (
                    <div key={task.id} className="h-12 flex items-center relative" style={{ position: 'absolute', left: 0, right: 0, top: index * 48 }}>
                      <div
                        className={cn("absolute h-8 rounded-lg cursor-pointer transition-all hover:brightness-110 hover:shadow-lg flex items-center overflow-hidden", hoveredTaskId === task.id && "ring-2 ring-offset-2 ring-offset-background")}
                        style={{ left: pos.left, width: pos.width - 4, backgroundColor: colors.bg, borderLeft: `3px solid ${colors.border}` }}
                        onMouseMove={(e) => onMouseMove(e, task.id)}
                        onMouseLeave={onMouseLeave}
                        onClick={() => onTaskSelect(task.id)}
                      >
                        <div className="absolute left-0 top-0 bottom-0 opacity-30" style={{ width: `${task.progress}%`, backgroundColor: pColor }} />
                        <span className="relative z-10 px-2 text-xs font-medium truncate text-foreground drop-shadow-md">{task.title}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {timelineData.taskBars.map((_, idx) => (<div key={idx} className="h-12 border-b border-border/20" />))}
            </div>
          </div>
        </div>
      </div>

      {hoveredTaskId && tooltipPosition && hoveredTask && (
        <div className="fixed z-50 bg-card border border-border rounded-xl shadow-xl p-3 text-sm max-w-xs pointer-events-none" style={{ left: tooltipPosition.x + 10, top: tooltipPosition.y - 10 }}>
          <p className="font-semibold mb-2 truncate">{hoveredTask.title}</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Start: {format(hoveredTask.start, "MMM d, yyyy")}</p>
            <p>End: {format(hoveredTask.end, "MMM d, yyyy")}</p>
            <p>Duration: {Math.max(1, differenceInDays(hoveredTask.end, hoveredTask.start) + 1)} day{Math.max(1, differenceInDays(hoveredTask.end, hoveredTask.start) + 1) !== 1 ? "s" : ""}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-muted-foreground">Progress:</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${hoveredTask.progress}%`, backgroundColor: PRIORITY_COLORS[hoveredTask.priority] || PRIORITY_COLORS.none }} />
              </div>
              <span className="text-xs">{hoveredTask.progress}%</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-muted-foreground">Status:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase" style={{ backgroundColor: STATUS_COLORS[hoveredTask.status]?.bg || "#6b7280", color: STATUS_COLORS[hoveredTask.status]?.text || "#fff" }}>
                {hoveredTask.status.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-5 px-4 py-2.5 border-t bg-muted/30 text-[11px]">
        {Object.entries(STATUS_COLORS).map(([key, colors]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-md" style={{ backgroundColor: colors.bg, borderRadius: '6px' }} />
            <span className="text-muted-foreground capitalize font-medium">{key.replace("_", " ")}</span>
          </div>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs">Click bars to open task</span>
        </div>
      </div>
    </div>
  )
}
