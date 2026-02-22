"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Calendar, Clock } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
import { Task } from "@/store"
import { cn } from "@/lib/utils"

export interface TaskCardProps {
  task: Task
  onClick?: () => void
  className?: string
}

export function TaskCard({ task, onClick, className }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const formatDueDate = (date: Date) => {
    const now = new Date()
    const dueDate = new Date(date)
    const diffTime = dueDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return { text: "Overdue", color: "text-status-red" }
    if (diffDays === 0) return { text: "Today", color: "text-status-orange" }
    if (diffDays === 1) return { text: "Tomorrow", color: "text-status-yellow" }
    if (diffDays <= 7) return { text: `${diffDays} days`, color: "text-muted-foreground" }
    return { text: dueDate.toLocaleDateString(), color: "text-muted-foreground" }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col gap-2 rounded-lg border border-border/50 bg-card p-3 shadow-sm transition-all duration-150 hover:border-border hover:shadow-md cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 shadow-lg",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-tight line-clamp-2">
          {task.title}
        </h4>
      </div>
      
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {task.description}
        </p>
      )}
      
      <div className="flex items-center gap-2 mt-1">
        <StatusBadge status={task.status} variant="status" />
        <StatusBadge priority={task.priority} variant="priority" />
      </div>
      
      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
        {task.dueDate && (
          <div className={cn("flex items-center gap-1", formatDueDate(task.dueDate).color)}>
            <Calendar className="h-3 w-3" />
            <span>{formatDueDate(task.dueDate).text}</span>
          </div>
        )}
        {task.estimatedTime && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{task.estimatedTime}h</span>
          </div>
        )}
      </div>
    </div>
  )
}
