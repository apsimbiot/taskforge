"use client"

import React, { useMemo, useState, useCallback } from "react"
import { Gantt, Task as GanttTask, ViewMode } from "gantt-task-react"
import "gantt-task-react/dist/index.css"
import { format, parseISO, addDays, differenceInDays } from "date-fns"
import { Calendar, Clock, GripVertical, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { TaskResponse } from "@/lib/api"

interface TimelineViewProps {
  tasks: TaskResponse[]
  onTaskUpdate: (taskId: string, dueDate: string) => void
  groupBy?: "space" | "project" | null
  statuses?: { value: string; label: string; color: string }[]
  workspaceMembers?: { id: string; name: string; avatar?: string }[]
}

type TimelineViewMode = "Day" | "Week" | "Month"

// Priority colors
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
  none: "#6b7280",
}

// Status colors
const STATUS_COLORS: Record<string, string> = {
  todo: "#6b7280",
  in_progress: "#3b82f6",
  review: "#eab308",
  done: "#22c55e",
}

// Transform TaskResponse to GanttTask format
function transformTaskToGantt(
  task: TaskResponse,
  index: number
): GanttTask {
  // Use createdAt as start date, dueDate as end date
  // If no dueDate, default to 7 days from createdAt
  const startDate = task.createdAt ? parseISO(task.createdAt) : new Date()
  let endDate = task.dueDate ? parseISO(task.dueDate) : addDays(startDate, 7)
  
  // If endDate is before startDate, adjust it
  if (endDate < startDate) {
    endDate = addDays(startDate, 7)
  }

  const priority = task.priority || "none"
  const status = task.status || "todo"

  return {
    id: task.id,
    name: task.title || "Untitled Task",
    start: startDate,
    end: endDate,
    type: "task",
    progress: status === "done" ? 100 : status === "in_progress" ? 50 : 0,
    isDisabled: false,
    styles: {
      backgroundColor: STATUS_COLORS[status] || "#6b7280",
      progressColor: PRIORITY_COLORS[priority] || "#6b7280",
      progressSelectedColor: "#ffffff",
      backgroundSelectedColor: STATUS_COLORS[status] || "#6b7280",
    },
    dependencies: task.parentTaskId ? [task.parentTaskId] : undefined,
  }
}

// Custom task bar component for more detail
const TaskBarContent = ({
  task,
  isSelected,
  onMouseDown,
}: {
  task: GanttTask
  isSelected: boolean
  onMouseDown: (e: React.MouseEvent) => void
}) => {
  const duration = differenceInDays(task.end, task.start)
  
  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-all",
        isSelected ? "ring-2 ring-white ring-offset-1" : "",
        "hover:opacity-90"
      )}
      style={{
        backgroundColor: task.styles?.backgroundColor,
        minWidth: "100px",
      }}
      onMouseDown={onMouseDown}
    >
      <GripVertical className="w-3 h-3 opacity-50 flex-shrink-0" />
      <span className="truncate flex-1 text-white font-medium">
        {task.name}
      </span>
      <span className="text-white/80 text-[10px] flex-shrink-0">
        {duration}d
      </span>
    </div>
  )
}

export function TimelineView({
  tasks,
  onTaskUpdate,
  groupBy = null,
  statuses = [],
  workspaceMembers = [],
}: TimelineViewProps) {
  const [viewMode, setViewMode] = useState<TimelineViewMode>("Week")
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [columnWidth, setColumnWidth] = useState(300)

  // Transform tasks to Gantt format
  const ganttTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return []
    
    // Filter tasks that have dates (createdAt is always available)
    const validTasks = tasks.filter((t) => t.createdAt)
    
    // Sort by created date
    const sorted = [...validTasks].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    
    return sorted.map((task, index) => transformTaskToGantt(task, index))
  }, [tasks])

  // Calculate date range for the view
  const { start: viewStart, end: viewEnd } = useMemo(() => {
    if (ganttTasks.length === 0) {
      const now = new Date()
      return {
        start: addDays(now, -7),
        end: addDays(now, 30),
      }
    }

    const allDates = ganttTasks.flatMap((t) => [t.start, t.end])
    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())))
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())))
    
    // Add padding
    return {
      start: addDays(minDate, -7),
      end: addDays(maxDate, 14),
    }
  }, [ganttTasks])

  // Handle task date changes (drag to reschedule)
  const handleTaskChange = useCallback(
    (task: GanttTask) => {
      const newDueDate = format(task.end, "yyyy-MM-dd")
      onTaskUpdate(task.id, newDueDate)
    },
    [onTaskUpdate]
  )

  // Handle progress changes
  const handleProgressChange = useCallback(
    (task: GanttTask) => {
      // Could implement status update based on progress
      console.log("Progress changed:", task.progress)
    },
    []
  )

  // Handle task selection
  const handleSelect = useCallback(
    (task: GanttTask | null) => {
      setSelectedTaskId(task?.id || null)
    },
    []
  )

  // Handle date scroll
  const handleDateScroll = useCallback((direction: "left" | "right") => {
    // This would scroll the timeline - could be implemented
    console.log("Scroll:", direction)
  }, [])

  // Zoom controls
  const handleZoom = useCallback((direction: "in" | "out") => {
    setColumnWidth((prev) => {
      if (direction === "in") return Math.min(prev + 100, 600)
      return Math.max(prev - 100, 150)
    })
  }, [])

  // Get view mode for gantt-task-react
  const getGanttViewMode = () => {
    switch (viewMode) {
      case "Day":
        return ViewMode.Day
      case "Week":
        return ViewMode.Week
      case "Month":
        return ViewMode.Month
      default:
        return ViewMode.Week
    }
  }

  // Calculate task stats
  const stats = useMemo(() => {
    if (!tasks) return { total: 0, completed: 0, inProgress: 0, overdue: 0 }
    
    const now = new Date()
    const completed = tasks.filter((t) => t.status === "done").length
    const inProgress = tasks.filter((t) => t.status === "in_progress").length
    const overdue = tasks.filter(
      (t) => t.dueDate && parseISO(t.dueDate) < now && t.status !== "done"
    ).length

    return {
      total: tasks.length,
      completed,
      inProgress,
      overdue,
    }
  }, [tasks])

  if (tasks.length === 0) {
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

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
            <Button
              variant={viewMode === "Day" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode("Day")}
            >
              Day
            </Button>
            <Button
              variant={viewMode === "Week" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode("Week")}
            >
              Week
            </Button>
            <Button
              variant={viewMode === "Month" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode("Month")}
            >
              Month
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleZoom("out")}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleZoom("in")}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-medium">{stats.total}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Done:</span>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {stats.completed}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">In Progress:</span>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {stats.inProgress}
            </Badge>
          </div>
          {stats.overdue > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Overdue:</span>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                {stats.overdue}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 overflow-auto bg-background">
        {ganttTasks.length > 0 ? (
          <div className="min-w-full" style={{ minHeight: "400px" }}>
            <Gantt
              tasks={ganttTasks}
              viewMode={getGanttViewMode()}
              onDateChange={handleTaskChange}
              onProgressChange={handleProgressChange}
              onSelect={handleSelect}
              listCellWidth=""
              columnWidth={columnWidth}
              barFill={60}
              ganttHeight={Math.max(400, ganttTasks.length * 48 + 100)}
              arrowColor="#6b7280"
              handleWidth={8}
              todayColor="rgba(59, 130, 246, 0.1)"
              barCornerRadius={4}
              barBackgroundColor="#6b7280"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full p-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No valid tasks to display on timeline
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-4 py-2 border-t bg-muted/30 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#6b7280]" />
          <span className="text-muted-foreground">To Do</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#3b82f6]" />
          <span className="text-muted-foreground">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#eab308]" />
          <span className="text-muted-foreground">Review</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[#22c55e]" />
          <span className="text-muted-foreground">Done</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Drag bars to reschedule</span>
        </div>
      </div>
    </div>
  )
}
