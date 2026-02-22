"use client"

import { use, useState, useCallback } from "react"
import {
  Plus,
  List,
  LayoutGrid,
  GanttChart,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Breadcrumb } from "@/components/breadcrumb"
import { StatusBadge } from "@/components/status-badge"
import { TimeTracker } from "@/components/time-tracker"
import { KanbanBoard } from "@/components/kanban-board"
import { useTasks, useCreateTask, useUpdateTask, useStatuses } from "@/hooks/useQueries"
import { cn } from "@/lib/utils"
import type { TaskResponse } from "@/lib/api"

type ViewMode = "list" | "board" | "gantt"
type TaskStatus = "todo" | "in_progress" | "review" | "done"

const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "review", "done"]

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "#6b7280",
  in_progress: "#3b82f6",
  review: "#eab308",
  done: "#22c55e",
}

function TaskListItem({
  task,
  onStatusChange,
}: {
  task: TaskResponse
  onStatusChange: (taskId: string, status: string) => void
}) {
  const status = (task.status || "todo") as TaskStatus
  const priority = task.priority || "none"

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 hover:bg-accent/30 transition-colors group">
      {/* Status circle */}
      <button
        onClick={() => {
          const currentIndex = STATUS_ORDER.indexOf(status)
          const nextStatus = STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length]
          onStatusChange(task.id, nextStatus)
        }}
        className="flex-shrink-0"
      >
        <div
          className="w-4 h-4 rounded-full border-2 transition-colors hover:scale-110"
          style={{
            borderColor: STATUS_COLORS[status],
            backgroundColor: status === "done" ? STATUS_COLORS.done : "transparent",
          }}
        />
      </button>

      {/* Title */}
      <span
        className={cn(
          "flex-1 text-sm truncate",
          status === "done" && "line-through text-muted-foreground"
        )}
      >
        {task.title}
      </span>

      {/* Priority */}
      {priority !== "none" && (
        <StatusBadge
          variant="priority"
          priority={priority as "low" | "medium" | "high" | "urgent"}
        />
      )}

      {/* Status */}
      <StatusBadge variant="status" status={status} />

      {/* Due date */}
      {task.dueDate && (
        <span className="text-xs text-muted-foreground">
          {new Date(task.dueDate).toLocaleDateString()}
        </span>
      )}
    </div>
  )
}

export default function ListPage({
  params,
}: {
  params: Promise<{ id: string; spaceId: string; listId: string }>
}) {
  const { id: workspaceId, spaceId, listId } = use(params)
  const { data: tasks, isLoading } = useTasks(listId)
  const { data: statuses } = useStatuses(listId)
  const createTaskMutation = useCreateTask()
  const updateTaskMutation = useUpdateTask()

  const [viewMode, setViewMode] = useState<ViewMode>("board")
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [showNewTask, setShowNewTask] = useState(false)

  const handleCreateTask = useCallback(() => {
    if (!newTaskTitle.trim()) return
    createTaskMutation.mutate({
      listId,
      title: newTaskTitle.trim(),
      status: "todo",
      priority: "medium",
    })
    setNewTaskTitle("")
    setShowNewTask(false)
  }, [newTaskTitle, listId, createTaskMutation])

  const handleStatusChange = useCallback(
    (taskId: string, status: string) => {
      updateTaskMutation.mutate({ taskId, status })
    },
    [updateTaskMutation]
  )

  const groupedTasks = tasks ? STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = tasks.filter((t) => (t.status || "todo") === status) || []
      return acc
    },
    {} as Record<TaskStatus, TaskResponse[]>
  ) : {}

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <Breadcrumb
          items={[
            { label: "Workspace", href: `/dashboard/workspaces/${workspaceId}` },
            {
              label: "Space",
              href: `/dashboard/workspaces/${workspaceId}/spaces/${spaceId}`,
            },
            { label: "List" },
          ]}
          className="mb-2"
        />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">List</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {tasks?.length ?? 0} task{(tasks?.length ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TimeTracker className="mr-2" />
            <div className="flex items-center border rounded-md overflow-hidden">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none h-8"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
              <Button
                variant={viewMode === "board" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none h-8"
                onClick={() => setViewMode("board")}
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Board
              </Button>
              <Button
                variant={viewMode === "gantt" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none h-8"
                onClick={() => setViewMode("gantt")}
              >
                <GanttChart className="h-4 w-4 mr-1" />
                Gantt
              </Button>
            </div>
            <Button onClick={() => setShowNewTask(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : viewMode === "list" ? (
          <div>
            {/* Add task input */}
            {showNewTask && (
              <div className="flex items-center gap-2 px-4 py-3 border-b bg-accent/20">
                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task name..."
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 h-8"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateTask()
                    if (e.key === "Escape") {
                      setShowNewTask(false)
                      setNewTaskTitle("")
                    }
                  }}
                  autoFocus
                />
                <Button size="sm" onClick={handleCreateTask}>
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowNewTask(false)
                    setNewTaskTitle("")
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Task list */}
            {tasks && tasks.length > 0 ? (
              <div>
                {tasks.map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <List className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first task to get started.
                </p>
                <Button onClick={() => setShowNewTask(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            )}
          </div>
        ) : viewMode === "board" ? (
          <div className="h-full">
            {statuses && statuses.length > 0 ? (
              <KanbanBoard
                tasks={tasks || []}
                statuses={statuses}
                listId={listId}
              />
            ) : (
              <div className="p-12 text-center">
                <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No statuses configured</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This list doesn't have any statuses yet. Create tasks to get started.
                </p>
                <Button onClick={() => setShowNewTask(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            )}
          </div>
        ) : (
          // Gantt view placeholder
          <div className="p-12 text-center">
            <GanttChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Gantt View</h3>
            <p className="text-sm text-muted-foreground">
              Coming soon — timeline visualization for your tasks.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
