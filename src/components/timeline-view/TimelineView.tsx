"use client"

import React, { useMemo, useState, useCallback } from "react"
import { Gantt, Task as GanttTask, ViewMode } from "gantt-task-react"
import "gantt-task-react/dist/index.css"
import { format, parseISO, addDays } from "date-fns"
import { Calendar, Clock, ZoomIn, ZoomOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { TaskResponse } from "@/lib/api"

interface TimelineViewProps {
  tasks: TaskResponse[]
  onTaskUpdate: (taskId: string, dueDate: string | undefined) => void
  onTaskClick?: (taskId: string) => void
  groupBy?: "status" | "priority" | null
  statuses?: { value: string; label: string; color: string }[]
}

type TimelineZoom = "Day" | "Week" | "Month"

// Status colors
const STATUS_COLORS: Record<string, string> = {
  todo: "#6b7280",
  in_progress: "#3b82f6",
  review: "#eab308",
  done: "#22c55e",
}

// Priority colors for progress bar
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
  none: "#94a3b8",
}

function taskToGantt(task: TaskResponse): GanttTask {
  const start = task.createdAt ? parseISO(task.createdAt) : new Date()
  let end = task.dueDate ? parseISO(task.dueDate) : addDays(start, 7)

  // Ensure end is after start (at least 1 day)
  if (end <= start) {
    end = addDays(start, 1)
  }

  const status = task.status || "todo"
  const priority = task.priority || "none"

  return {
    id: task.id,
    name: task.title || "Untitled Task",
    start,
    end,
    type: "task",
    progress: status === "done" ? 100 : status === "review" ? 75 : status === "in_progress" ? 50 : 0,
    isDisabled: false,
    project: task.parentTaskId || undefined,
    dependencies: task.parentTaskId ? [task.parentTaskId] : undefined,
    styles: {
      backgroundColor: STATUS_COLORS[status] || "#6b7280",
      backgroundSelectedColor: STATUS_COLORS[status] || "#6b7280",
      progressColor: PRIORITY_COLORS[priority] || "#94a3b8",
      progressSelectedColor: PRIORITY_COLORS[priority] || "#94a3b8",
    },
  }
}

// Custom tooltip
const TooltipContent: React.FC<{
  task: GanttTask
  fontSize: string
  fontFamily: string
}> = ({ task }) => {
  const duration = Math.max(
    1,
    Math.round((task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24))
  )
  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm max-w-xs">
      <p className="font-semibold mb-1 truncate">{task.name}</p>
      <div className="text-muted-foreground space-y-0.5 text-xs">
        <p>Start: {format(task.start, "MMM d, yyyy")}</p>
        <p>End: {format(task.end, "MMM d, yyyy")}</p>
        <p>Duration: {duration} day{duration !== 1 ? "s" : ""}</p>
        <p>Progress: {task.progress}%</p>
      </div>
    </div>
  )
}

export function TimelineView({
  tasks,
  onTaskUpdate,
  onTaskClick,
  groupBy = null,
  statuses = [],
}: TimelineViewProps) {
  const [zoom, setZoom] = useState<TimelineZoom>("Week")
  const [columnWidth, setColumnWidth] = useState(65)

  // Transform tasks → gantt tasks, sorted by creation date
  const ganttTasks = useMemo(() => {
    if (!tasks || tasks.length === 0) return []

    return [...tasks]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(taskToGantt)
  }, [tasks])

  // Drag to reschedule
  const handleDateChange = useCallback(
    (task: GanttTask, _children: GanttTask[]) => {
      onTaskUpdate(task.id, format(task.end, "yyyy-MM-dd"))
    },
    [onTaskUpdate]
  )

  // Click to open task detail
  const handleClick = useCallback(
    (task: GanttTask) => {
      onTaskClick?.(task.id)
    },
    [onTaskClick]
  )

  const handleSelect = useCallback(
    (_task: GanttTask, _isSelected: boolean) => {
      // no-op for now, selection is visual only
    },
    []
  )

  // View mode mapping
  const viewMode = zoom === "Day" ? ViewMode.Day : zoom === "Week" ? ViewMode.Week : ViewMode.Month

  // Zoom helpers
  const handleZoomIn = useCallback(() => {
    setColumnWidth((w) => Math.min(w + 20, 200))
  }, [])
  const handleZoomOut = useCallback(() => {
    setColumnWidth((w) => Math.max(w - 20, 30))
  }, [])

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

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-background">
        <div className="flex items-center gap-3">
          {/* Time-scale switcher */}
          <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
            {(["Day", "Week", "Month"] as TimelineZoom[]).map((z) => (
              <Button
                key={z}
                variant={zoom === z ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setZoom(z)}
              >
                {z}
              </Button>
            ))}
          </div>

          {/* Zoom level */}
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats chips */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{stats.total}</span> tasks
          </span>
          {stats.completed > 0 && (
            <Badge variant="outline" className="h-5 bg-green-50 text-green-700 border-green-200 text-[11px]">
              {stats.completed} done
            </Badge>
          )}
          {stats.inProgress > 0 && (
            <Badge variant="outline" className="h-5 bg-blue-50 text-blue-700 border-blue-200 text-[11px]">
              {stats.inProgress} active
            </Badge>
          )}
          {stats.overdue > 0 && (
            <Badge variant="outline" className="h-5 bg-red-50 text-red-700 border-red-200 text-[11px]">
              {stats.overdue} overdue
            </Badge>
          )}
        </div>
      </div>

      {/* ── Gantt chart ─────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {ganttTasks.length > 0 ? (
          <Gantt
            tasks={ganttTasks}
            viewMode={viewMode}
            onDateChange={handleDateChange}
            onClick={handleClick}
            onSelect={handleSelect}
            columnWidth={columnWidth}
            listCellWidth="155"
            rowHeight={42}
            barFill={65}
            ganttHeight={0}
            headerHeight={50}
            handleWidth={8}
            arrowColor="#94a3b8"
            todayColor="rgba(59, 130, 246, 0.08)"
            barCornerRadius={4}
            barBackgroundColor="#6b7280"
            barBackgroundSelectedColor="#475569"
            fontSize="12px"
            TooltipContent={TooltipContent}
          />
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-muted-foreground">No displayable tasks</p>
          </div>
        )}
      </div>

      {/* ── Legend ───────────────────────────────────────────── */}
      <div className="flex items-center gap-5 px-4 py-2 border-t bg-muted/30 text-[11px]">
        {Object.entries(STATUS_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground capitalize">{key.replace("_", " ")}</span>
          </div>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Drag bars to reschedule · Click to open</span>
        </div>
      </div>
    </div>
  )
}
