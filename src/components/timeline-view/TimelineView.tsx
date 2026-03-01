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

// Status colors - TaskForge theme
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  todo: { bg: "#6b7280", border: "#9ca3af", text: "#ffffff" },
  in_progress: { bg: "#3b82f6", border: "#60a5fa", text: "#ffffff" },
  review: { bg: "#eab308", border: "#facc15", text: "#000000" },
  done: { bg: "#22c55e", border: "#4ade80", text: "#ffffff" },
}

// Priority colors
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#FF6B35",
  medium: "#eab308",
  low: "#22c55e",
  none: "#94a3b8",
}

interface TaskBar {
  id: string
  title: string
  start: Date
  end: Date
  status: string
  priority: string
  progress: number
}

function getTaskBar(task: TaskResponse): TaskBar | null {
  if (!task.dueDate && !task.createdAt) return null
  
  const start = task.createdAt ? parseISO(task.createdAt) : new Date()
  let end = task.dueDate ? parseISO(task.dueDate) : addDays(start, 7)

  if (end < start) {
    end = addDays(start, 1)
  }

  const status = task.status || "todo"
  const priority = task.priority || "none"
  const progress = status === "done" ? 100 : status === "review" ? 75 : status === "in_progress" ? 50 : 0

  return {
    id: task.id,
    title: task.title || "Untitled Task",
    start,
    end,
    status,
    priority,
    progress,
  }
}

export function TimelineView({
  tasks,
  onTaskUpdate,
  onTaskClick,
}: TimelineViewProps) {
  const [zoom, setZoom] = useState<TimelineZoom>("Week")
  const [hoveredTask, setHoveredTask] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Day width based on zoom
  const dayWidth = zoom === "Day" ? 80 : zoom === "Week" ? 40 : 20

  // Get date range based on zoom and tasks
  const { dateRange, days } = useMemo(() => {
    const now = new Date()
    let start: Date, end: Date

    const taskBars = tasks.map(getTaskBar).filter(Boolean) as TaskBar[]
    const taskStarts = taskBars.map(t => t.start)
    const taskEnds = taskBars.map(t => t.end)

    if (taskBars.length > 0) {
      const minDate = new Date(Math.min(...taskStarts.map(d => d.getTime())))
      const maxDate = new Date(Math.max(...taskEnds.map(d => d.getTime())))
      
      if (zoom === "Day") {
        start = addDays(minDate, -3)
        end = addDays(maxDate, 14)
      } else if (zoom === "Week") {
        start = addDays(startOfWeek(minDate), -7)
        end = addDays(endOfWeek(maxDate), 14)
      } else {
        start = addDays(startOfMonth(minDate), -14)
        end = addDays(endOfMonth(maxDate), 30)
      }
    } else {
      // Default range when no tasks
      start = addDays(startOfWeek(now), -7)
      end = addDays(endOfWeek(now), 14)
    }

    const daysArray = eachDayOfInterval({ start, end })

    return { dateRange: { start, end }, days: daysArray }
  }, [tasks, zoom])

  // Calculate task bar positions
  const taskBars = useMemo(() => {
    return tasks
      .map(getTaskBar)
      .filter(Boolean) as TaskBar[]
      .sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [tasks])

  // Get position and width for a task bar
  const getBarStyle = (task: TaskBar) => {
    const startOffset = differenceInDays(task.start, dateRange.start)
    const duration = differenceInDays(task.end, task.start) + 1
    
    return {
      left: startOffset * dayWidth,
      width: Math.max(duration * dayWidth, dayWidth),
    }
  }

  // Stats
  const stats = useMemo(() => {
    const now = new Date()
    return {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === "done").length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      overdue: tasks.filter(
        (t) => t.dueDate && parseISO(t.dueDate) < now && t.status !== "done"
      ).length,
    }
  }, [tasks])

  // Handle mouse move for tooltip
  const handleMouseMove = (e: React.MouseEvent, task: TaskBar) => {
    setHoveredTask(task.id)
    setTooltipPos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseLeave = () => {
    setHoveredTask(null)
    setTooltipPos(null)
  }

  // Handle task click
  const handleTaskClick = (taskId: string) => {
    onTaskClick?.(taskId)
  }

  // Empty state
  if (!tasks.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No tasks to display</h3>
        <p className="text-sm text-muted-foreground">
          Create tasks with due dates to see them on the timeline.
        </p>
      </div>
    )
  }

  const timelineWidth = days.length * dayWidth

  // Get the hovered task object
  const hoveredTaskData = taskBars.find(t => t.id === hoveredTask)

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl overflow-hidden border border-border">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-card">
        <div className="flex items-center gap-3">
          {/* Time-scale switcher */}
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

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
              Today
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats chips */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{stats.total}</span> tasks
          </span>
          {stats.completed > 0 && (
            <Badge variant="outline" className="h-5 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 text-[11px]">
              {stats.completed} done
            </Badge>
          )}
          {stats.inProgress > 0 && (
            <Badge variant="outline" className="h-5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-[11px]">
              {stats.inProgress} active
            </Badge>
          )}
          {stats.overdue > 0 && (
            <Badge variant="outline" className="h-5 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 text-[11px]">
              {stats.overdue} overdue
            </Badge>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 flex overflow-hidden" ref={containerRef}>
        {/* Left panel - Task list */}
        <div className="w-64 flex-shrink-0 border-r bg-muted/20 overflow-y-auto">
          <div className="h-14 flex items-center px-4 border-b bg-muted/30">
            <span className="text-sm font-medium text-muted-foreground">Tasks</span>
          </div>
          <div className="divide-y divide-border">
            {taskBars.map((task) => {
              const statusColors = STATUS_COLORS[task.status] || STATUS_COLORS.todo
              return (
                <div
                  key={task.id}
                  className="h-12 flex items-center px-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleTaskClick(task.id)}
                >
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0 mr-3"
                    style={{ backgroundColor: statusColors.bg }}
                  />
                  <span className="text-sm truncate text-foreground">{task.title}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right panel - Timeline grid */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div style={{ minWidth: timelineWidth }}>
            {/* Header with dates */}
            <div className="h-14 flex border-b bg-muted/30 sticky top-0 z-10">
              {days.map((day, i) => {
                const isWeekend = day.getDay() === 0 || day.getDay() === 6
                const isTodayDate = isToday(day)
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex-shrink-0 flex flex-col items-center justify-center border-r border-border/50",
                      isWeekend && "bg-muted/20",
                      isTodayDate && "bg-orange-500/10"
                    )}
                    style={{ width: dayWidth }}
                  >
                    <span className={cn(
                      "text-[10px] uppercase font-medium",
                      isTodayDate ? "text-orange-500" : "text-muted-foreground"
                    )}>
                      {format(day, "EEE")}
                    </span>
                    <span className={cn(
                      "text-sm font-semibold",
                      isTodayDate ? "text-orange-500" : "text-foreground"
                    )}>
                      {format(day, "d")}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Grid rows with task bars */}
            <div className="relative">
              {/* Grid background */}
              <div className="absolute inset-0 flex">
                {days.map((day, i) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-shrink-0 border-r border-border/30",
                        isWeekend && "bg-muted/10"
                      )}
                      style={{ width: dayWidth }}
                    />
                  )
                })}
              </div>

              {/* Today marker */}
              {days.some(d => isToday(d)) && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-orange-500 z-20"
                  style={{
                    left: differenceInDays(new Date(), dateRange.start) * dayWidth + dayWidth / 2,
                  }}
                />
              )}

              {/* Task bars */}
              <div className="relative">
                {taskBars.map((task, index) => {
                  const { left, width } = getBarStyle(task)
                  const statusColors = STATUS_COLORS[task.status] || STATUS_COLORS.todo
                  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.none

                  return (
                    <div
                      key={task.id}
                      className="h-12 flex items-center relative"
                      style={{ 
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: index * 48,
                      }}
                    >
                      <div
                        className={cn(
                          "absolute h-8 rounded-lg cursor-pointer transition-all hover:brightness-110 hover:shadow-lg flex items-center overflow-hidden",
                          hoveredTask === task.id && "ring-2 ring-offset-2 ring-offset-background"
                        )}
                        style={{
                          left: left,
                          width: width - 4,
                          backgroundColor: statusColors.bg,
                          borderLeft: `3px solid ${statusColors.border}`,
                        }}
                        onMouseMove={(e) => handleMouseMove(e, task)}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => handleTaskClick(task.id)}
                      >
                        {/* Progress bar */}
                        <div
                          className="absolute left-0 top-0 bottom-0 opacity-30"
                          style={{
                            width: `${task.progress}%`,
                            backgroundColor: priorityColor,
                          }}
                        />
                        {/* Task label */}
                        <span className="relative z-10 px-2 text-xs font-medium truncate text-foreground drop-shadow-md">
                          {task.title}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Row backgrounds for alignment */}
              {taskBars.map((_, index) => (
                <div
                  key={index}
                  className="h-12 border-b border-border/20"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredTask && tooltipPos && hoveredTaskData && (
        <div
          className="fixed z-50 bg-card border border-border rounded-xl shadow-xl p-3 text-sm max-w-xs pointer-events-none"
          style={{
            left: tooltipPos.x + 10,
            top: tooltipPos.y - 10,
          }}
        >
          <p className="font-semibold mb-2 truncate">{hoveredTaskData.title}</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Start: {format(hoveredTaskData.start, "MMM d, yyyy")}</p>
            <p>End: {format(hoveredTaskData.end, "MMM d, yyyy")}</p>
            <p>Duration: {Math.max(1, differenceInDays(hoveredTaskData.end, hoveredTaskData.start) + 1)} day{Math.max(1, differenceInDays(hoveredTaskData.end, hoveredTaskData.start) + 1) !== 1 ? "s" : ""}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-muted-foreground">Progress:</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full"
                  style={{ 
                    width: `${hoveredTaskData.progress}%`,
                    backgroundColor: PRIORITY_COLORS[hoveredTaskData.priority] || PRIORITY_COLORS.none
                  }}
                />
              </div>
              <span className="text-xs">{hoveredTaskData.progress}%</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-muted-foreground">Status:</span>
              <span 
                className="px-2 py-0.5 rounded text-[10px] font-medium uppercase"
                style={{ 
                  backgroundColor: STATUS_COLORS[hoveredTaskData.status]?.bg || "#6b7280",
                  color: STATUS_COLORS[hoveredTaskData.status]?.text || "#fff"
                }}
              >
                {hoveredTaskData.status.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-5 px-4 py-2.5 border-t bg-muted/30 text-[11px]">
        {Object.entries(STATUS_COLORS).map(([key, colors]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div 
              className="w-3 h-3 rounded-md" 
              style={{ backgroundColor: colors.bg, borderRadius: '6px' }} 
            />
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
