"use client"

import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Calendar, Clock, Trash2, UserPlus } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { extractTextFromTiptap } from "@/lib/tiptap"
import type { TaskResponse } from "@/lib/api"

export interface TaskCardProps {
  task: TaskResponse
  onClick?: () => void
  onDelete?: (taskId: string) => void
  onAssign?: (taskId: string) => void
  className?: string
}

export function TaskCard({ task, onClick, onDelete, onAssign, className }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const [isHovered, setIsHovered] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const formatDueDate = (date: string) => {
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

  // Get description from Tiptap JSON
  const description = extractTextFromTiptap(task.description)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete && confirm("Are you sure you want to delete this task?")) {
      onDelete(task.id)
    }
  }

  const handleAssign = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onAssign) {
      onAssign(task.id)
    }
  }

  return (
    <TooltipProvider>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "group relative flex flex-col gap-2 rounded-lg border border-border/50 bg-card p-3 shadow-sm transition-all duration-150 hover:border-border hover:shadow-md cursor-grab active:cursor-grabbing",
          isDragging && "opacity-50 shadow-lg",
          className
        )}
      >
        {/* Hover Actions */}
        <div className={cn(
          "absolute top-2 right-2 flex items-center gap-1 transition-opacity duration-150",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={handleAssign}
              >
                <UserPlus className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Quick assign</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={handleDelete}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete task</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-start justify-between gap-2 pr-8">
          <h4 className="text-sm font-medium leading-tight line-clamp-2">
            {task.title}
          </h4>
        </div>
        
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-1">
          {task.priority && task.priority !== "none" && (
            <StatusBadge 
              priority={task.priority as "low" | "medium" | "high" | "urgent"} 
              variant="priority" 
            />
          )}
        </div>
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          {task.dueDate && (
            <div className={cn("flex items-center gap-1", formatDueDate(task.dueDate).color)}>
              <Calendar className="h-3 w-3" />
              <span>{formatDueDate(task.dueDate).text}</span>
            </div>
          )}
          {task.timeEstimate && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{task.timeEstimate}m</span>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

// Drag overlay version - no interactivity
export function TaskCardOverlay({ task }: { task: TaskResponse }) {
  const formatDueDate = (date: string) => {
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

  const description = extractTextFromTiptap(task.description)

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-xl cursor-grabbing w-[288px]">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-tight line-clamp-2">
          {task.title}
        </h4>
      </div>
      
      {description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {description}
        </p>
      )}
      
      <div className="flex items-center gap-2 mt-1">
        {task.priority && task.priority !== "none" && (
          <StatusBadge 
            priority={task.priority as "low" | "medium" | "high" | "urgent"} 
            variant="priority" 
          />
        )}
      </div>
      
      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
        {task.dueDate && (
          <div className={cn("flex items-center gap-1", formatDueDate(task.dueDate).color)}>
            <Calendar className="h-3 w-3" />
            <span>{formatDueDate(task.dueDate).text}</span>
          </div>
        )}
        {task.timeEstimate && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{task.timeEstimate}m</span>
          </div>
        )}
      </div>
    </div>
  )
}
