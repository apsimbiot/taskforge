"use client"

import { useState, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable"
import { useQueryClient } from "@tanstack/react-query"
import { TaskCardOverlay } from "@/components/task-card"
import { KanbanColumn } from "@/components/kanban-column"
import { TaskDetailPanel } from "@/components/task-detail-panel"
import { useUpdateTask, useDeleteTask } from "@/hooks/useQueries"
import { useTaskPanel } from "@/store/useTaskPanel"
import { toast } from "sonner"
import type { TaskResponse, StatusResponse } from "@/lib/api"

export interface KanbanBoardProps {
  tasks: TaskResponse[]
  statuses: StatusResponse[]
  listId: string
}

/**
 * Map a status name to its normalized slug form.
 * Handles common variations: "To Do" → "todo", "In Progress" → "in_progress", etc.
 */
function normalizeStatusName(name: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, "_")
  // Handle common variations
  const aliases: Record<string, string> = {
    "to_do": "todo",
    "in_review": "review",
  }
  return aliases[slug] ?? slug
}

export function KanbanBoard({ tasks, statuses, listId }: KanbanBoardProps) {
  const queryClient = useQueryClient()
  const updateTaskMutation = useUpdateTask()
  const deleteTaskMutation = useDeleteTask()
  const { selectedTaskId, setSelectedTask, isOpen, close } = useTaskPanel()

  const handleTaskDelete = (taskId: string) => {
    deleteTaskMutation.mutate(taskId, {
      onSuccess: () => {
        toast.success("Task deleted")
        queryClient.invalidateQueries({ queryKey: ["tasks", listId] })
      },
      onError: () => {
        toast.error("Failed to delete task")
      },
    })
  }

  const handleTaskAssign = (taskId: string) => {
    // Open the task detail panel for assignment
    setSelectedTask(taskId)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Build a mapping from normalized status name → status object
  const statusMap = useMemo(() => {
    const map: Record<string, StatusResponse> = {}
    statuses.forEach((s) => {
      map[normalizeStatusName(s.name)] = s
    })
    return map
  }, [statuses])

  // Group tasks by their status column
  // Tasks have status like "todo", statuses have names like "To Do"
  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, TaskResponse[]> = {}
    statuses.forEach((status) => {
      const normalizedName = normalizeStatusName(status.name)
      grouped[status.id] = tasks
        .filter((task) => {
          const taskStatus = task.status || "todo"
          return taskStatus === normalizedName
        })
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    })
    return grouped
  }, [tasks, statuses])

  const [activeTask, setActiveTask] = useState<TaskResponse | null>(null)

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragOver = (_event: DragOverEvent) => {
    // Visual feedback handled by the droppable isOver state in KanbanColumn
  }

  // Find which status column a task belongs to
  const findColumnForTask = (taskStatus: string | null): StatusResponse | undefined => {
    const normalized = taskStatus || "todo"
    return statusMap[normalized]
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const draggedTask = tasks.find((t) => t.id === activeId)
    if (!draggedTask) return

    // Check if dropped on a column (empty area)
    const overStatus = statuses.find((s) => s.id === overId)
    if (overStatus) {
      const currentColumn = findColumnForTask(draggedTask.status)
      if (currentColumn?.id !== overStatus.id) {
        // Moving to a new column — update the task's status to the normalized name
        const newStatusValue = normalizeStatusName(overStatus.name)
        const statusTasks = tasksByColumn[overStatus.id] || []
        const newOrder = statusTasks.length > 0
          ? Math.max(...statusTasks.map(t => t.order ?? 0)) + 1
          : 0

        updateTaskMutation.mutate({
          taskId: activeId,
          status: newStatusValue,
          order: newOrder,
        })
      }
      return
    }

    // Check if dropped on another task
    const overTask = tasks.find((t) => t.id === overId)
    if (overTask) {
      const activeColumn = findColumnForTask(draggedTask.status)
      const overColumn = findColumnForTask(overTask.status)

      if (!activeColumn || !overColumn) return

      if (activeColumn.id === overColumn.id) {
        // Same column reorder
        const columnTasks = [...(tasksByColumn[activeColumn.id] || [])]
        const oldIndex = columnTasks.findIndex((t) => t.id === activeId)
        const newIndex = columnTasks.findIndex((t) => t.id === overId)

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reordered = arrayMove(columnTasks, oldIndex, newIndex)

          // Update order for all affected tasks
          reordered.forEach((task, index) => {
            if (task.order !== index) {
              updateTaskMutation.mutate({
                taskId: task.id,
                order: index,
              }, {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: ["tasks", listId] })
                }
              })
            }
          })
        }
      } else {
        // Moving to different column
        const newStatusValue = normalizeStatusName(overColumn.name)
        const overColumnTasks = [...(tasksByColumn[overColumn.id] || [])]
        const newIndex = overColumnTasks.findIndex((t) => t.id === overId)
        const newOrder = newIndex >= 0 ? newIndex : overColumnTasks.length

        updateTaskMutation.mutate({
          taskId: activeId,
          status: newStatusValue,
          order: newOrder,
        })
      }
    }
  }

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : null

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-6 overflow-x-auto h-full">
          {statuses.map((status) => {
            const columnTasks = tasksByColumn[status.id] || []
            return (
              <KanbanColumn
                key={status.id}
                status={status}
                tasks={columnTasks}
                onTaskClick={(taskId) => setSelectedTask(taskId)}
                onTaskDelete={handleTaskDelete}
                onTaskAssign={handleTaskAssign}
              />
            )
          })}
        </div>

        <DragOverlay>
          {activeTask && <TaskCardOverlay task={activeTask} />}
        </DragOverlay>
      </DndContext>

      <TaskDetailPanel
        task={selectedTask}
        open={isOpen}
        onClose={close}
        statuses={statuses}
      />
    </>
  )
}
