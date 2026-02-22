"use client"

import { useMemo } from "react"
import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Plus } from "lucide-react"
import { TaskCard } from "@/components/task-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { TaskResponse, StatusResponse } from "@/lib/api"

export interface KanbanColumnProps {
  status: StatusResponse
  tasks: TaskResponse[]
  onTaskClick: (taskId: string) => void
  onQuickAdd?: () => void
}

export function KanbanColumn({ status, tasks, onTaskClick, onQuickAdd }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  })

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks])

  return (
    <div
      className={`flex flex-col w-80 min-w-[320px] bg-muted/30 rounded-lg transition-colors ${
        isOver ? "bg-muted/60 ring-2 ring-primary/20" : ""
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: status.color || "#6366f1" }}
        />
        <span className="text-sm font-semibold truncate">{status.name}</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {tasks.length}
        </Badge>
      </div>

      {/* Task List */}
      <div
        ref={setNodeRef}
        className="flex-1 p-2 space-y-2 overflow-auto min-h-[200px]"
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task.id)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border-2 border-dashed border-border/50 rounded-lg">
            Drop tasks here
          </div>
        )}
      </div>

      {/* Quick Add Button */}
      {onQuickAdd && (
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={onQuickAdd}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add task
          </Button>
        </div>
      )}
    </div>
  )
}
