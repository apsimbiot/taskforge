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
import { Plus } from "lucide-react"
import { TaskCardOverlay } from "@/components/task-card"
import { KanbanColumn } from "@/components/kanban-column"
import { TaskDetailPanel } from "@/components/task-detail-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUpdateTask, useDeleteTask, useCreateTask, useCreateStatus, useUpdateStatus, useDeleteStatus, useReorderStatuses } from "@/hooks/useQueries"
import { useTaskPanel } from "@/store/useTaskPanel"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { TaskResponse, StatusResponse } from "@/lib/api"

const PRESET_COLORS = [
  { name: "Gray", value: "#6b7280" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
]

export interface KanbanBoardProps {
  tasks: TaskResponse[]
  statuses: StatusResponse[]
  listId: string
  workspaceId?: string
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

export function KanbanBoard({ tasks, statuses, listId, workspaceId }: KanbanBoardProps) {
  const queryClient = useQueryClient()
  const updateTaskMutation = useUpdateTask()
  const deleteTaskMutation = useDeleteTask()
  const createTaskMutation = useCreateTask()
  const createStatusMutation = useCreateStatus()
  const updateStatusMutation = useUpdateStatus()
  const deleteStatusMutation = useDeleteStatus()
  const reorderStatusesMutation = useReorderStatuses()
  const { selectedTaskId, setSelectedTask, isOpen, close } = useTaskPanel()

  // Add column state
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState("")
  const [newColumnColor, setNewColumnColor] = useState("#6366f1")

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

  // Add column handlers
  const handleAddColumn = () => {
    if (!newColumnName.trim()) return
    
    createStatusMutation.mutate({
      listId,
      name: newColumnName.trim(),
      color: newColumnColor,
    }, {
      onSuccess: () => {
        toast.success("Column added")
        setShowAddColumn(false)
        setNewColumnName("")
        setNewColumnColor("#6366f1")
      },
      onError: () => {
        toast.error("Failed to add column")
      },
    })
  }

  // Column action handlers
  const handleStatusRename = (statusId: string, newName: string) => {
    updateStatusMutation.mutate({
      listId,
      statusId,
      name: newName,
    }, {
      onSuccess: () => {
        toast.success("Column renamed")
      },
      onError: () => {
        toast.error("Failed to rename column")
      },
    })
  }

  const handleStatusColorChange = (statusId: string, color: string) => {
    updateStatusMutation.mutate({
      listId,
      statusId,
      color,
    }, {
      onSuccess: () => {
        toast.success("Color updated")
      },
      onError: () => {
        toast.error("Failed to update color")
      },
    })
  }

  const handleStatusDelete = (statusId: string) => {
    deleteStatusMutation.mutate({
      listId,
      statusId,
    }, {
      onSuccess: () => {
        toast.success("Column deleted")
        queryClient.invalidateQueries({ queryKey: ["tasks", listId] })
      },
      onError: () => {
        toast.error("Failed to delete column")
      },
    })
  }

  const handleMoveColumn = (statusId: string, direction: "left" | "right") => {
    const currentIndex = statuses.findIndex(s => s.id === statusId)
    if (currentIndex === -1) return
    
    const newIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= statuses.length) return
    
    const newOrder = [...statuses]
    const [moved] = newOrder.splice(currentIndex, 1)
    newOrder.splice(newIndex, 0, moved)
    
    const statusIds = newOrder.map(s => s.id)
    
    reorderStatusesMutation.mutate({
      listId,
      statusIds,
    }, {
      onSuccess: () => {
        toast.success("Column moved")
      },
      onError: () => {
        toast.error("Failed to move column")
      },
    })
  }

  // Quick add task handler
  const handleQuickAddTask = (statusId: string, title: string) => {
    if (!title.trim()) return
    
    const status = statuses.find(s => s.id === statusId)
    if (!status) return
    
    createTaskMutation.mutate({
      listId,
      title: title.trim(),
      status: normalizeStatusName(status.name),
    }, {
      onSuccess: () => {
        toast.success("Task created")
        queryClient.invalidateQueries({ queryKey: ["tasks", listId] })
      },
      onError: () => {
        toast.error("Failed to create task")
      },
    })
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
          {statuses.map((status, index) => {
            const columnTasks = tasksByColumn[status.id] || []
            return (
              <KanbanColumn
                key={status.id}
                status={status}
                tasks={columnTasks}
                onTaskClick={(taskId) => setSelectedTask(taskId)}
                onTaskDelete={handleTaskDelete}
                onTaskAssign={handleTaskAssign}
                onQuickAdd={(title) => handleQuickAddTask(status.id, title)}
                onStatusRename={handleStatusRename}
                onStatusColorChange={handleStatusColorChange}
                onStatusDelete={handleStatusDelete}
                onMoveLeft={(statusId) => handleMoveColumn(statusId, "left")}
                onMoveRight={(statusId) => handleMoveColumn(statusId, "right")}
                canMoveLeft={index > 0}
                canMoveRight={index < statuses.length - 1}
              />
            )
          })}

          {/* Add Column Button */}
          <div className="flex-shrink-0">
            {showAddColumn ? (
              <div className="w-80 min-w-[320px] bg-muted/30 rounded-lg p-4 space-y-3 border">
                <Input
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Column name..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddColumn()
                    if (e.key === "Escape") {
                      setShowAddColumn(false)
                      setNewColumnName("")
                    }
                  }}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Color:</span>
                  <div className="flex gap-1">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color.value}
                        className={cn(
                          "w-6 h-6 rounded-full transition-transform hover:scale-110",
                          newColumnColor === color.value && "ring-2 ring-offset-2 ring-primary"
                        )}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setNewColumnColor(color.value)}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={handleAddColumn}>
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setShowAddColumn(false)
                    setNewColumnName("")
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-80 min-w-[320px] h-12 justify-start text-muted-foreground hover:text-foreground border-2 border-dashed border-border/50"
                onClick={() => setShowAddColumn(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Column
              </Button>
            )}
          </div>
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
