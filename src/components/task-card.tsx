"use client"

import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Calendar, Clock, Trash2, UserPlus, MessageSquare, CheckSquare, Flag } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { extractTextFromTiptap } from "@/lib/tiptap"
import { useTaskAssignees, useSubtasks, useComments } from "@/hooks/useQueries"
import type { TaskResponse } from "@/lib/api"

const PRIORITY_BORDER_COLORS: Record<string, string> = {
  urgent: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-blue-500",
  low: "border-l-gray-400",
}

const PRIORITY_FLAG_COLORS: Record<string, string> = {
  urgent: "text-red-500",
  high: "text-orange-500",
  medium: "text-blue-500",
  low: "text-gray-400",
}

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

  // Fetch extra data for polish
  const { data: assignees } = useTaskAssignees(task.id)
  const { data: subtasks } = useSubtasks(task.id)
  const { data: comments } = useComments(task.id)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const formatDueDate = (date: string) => {
    const now = new Date()
    const dueDate = new Date(date)
    // Compare dates only (ignore time)
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
    const diffTime = dueDateOnly.getTime() - nowDate.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { text: "Overdue", bgColor: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" }
    if (diffDays === 0) return { text: "Today", bgColor: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400" }
    if (diffDays === 1) return { text: "Tomorrow", bgColor: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" }
    if (diffDays <= 7) return { text: `${diffDays}d`, bgColor: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" }
    return { text: dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }), bgColor: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" }
  }

  // Get description from Tiptap JSON
  const description = extractTextFromTiptap(task.description)

  // Subtask progress
  const subtaskTotal = subtasks?.length ?? 0
  const subtaskCompleted = subtasks?.filter(s => s.status === "done").length ?? 0
  const subtaskPercent = subtaskTotal > 0 ? Math.round((subtaskCompleted / subtaskTotal) * 100) : 0

  // Comment count
  const commentCount = comments?.length ?? 0

  // Priority border
  const priorityBorder = task.priority && task.priority !== "none"
    ? PRIORITY_BORDER_COLORS[task.priority] || ""
    : ""

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

  // Max 3 avatars, show +N for overflow
  const displayedAssignees = assignees?.slice(0, 3) ?? []
  const overflowCount = (assignees?.length ?? 0) - 3

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
          priorityBorder && `border-l-[3px] ${priorityBorder}`,
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

        {/* Title */}
        <div className="flex items-start justify-between gap-2 pr-8">
          <h4 className="text-sm font-medium leading-tight line-clamp-2">
            {task.title}
          </h4>
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}

        {/* Priority + Due Date row */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {task.priority && task.priority !== "none" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Flag className={cn("h-3 w-3", PRIORITY_FLAG_COLORS[task.priority] || "text-gray-400")} />
                  <StatusBadge
                    priority={task.priority as "low" | "medium" | "high" | "urgent"}
                    variant="priority"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} priority</p>
              </TooltipContent>
            </Tooltip>
          )}

          {task.dueDate && (
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] px-1.5 py-0 font-medium",
                formatDueDate(task.dueDate).bgColor
              )}
            >
              <Calendar className="h-3 w-3 mr-1" />
              {formatDueDate(task.dueDate).text}
            </Badge>
          )}
        </div>

        {/* Subtask progress */}
        {subtaskTotal > 0 && (
          <div className="flex items-center gap-2">
            <CheckSquare className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{subtaskCompleted}/{subtaskTotal}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  subtaskPercent === 100 ? "bg-green-500" : "bg-blue-500"
                )}
                style={{ width: `${subtaskPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Bottom row: Assignees + metadata */}
        <div className="flex items-center justify-between mt-1">
          {/* Left: time estimate + comment count */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {task.timeEstimate && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{task.timeEstimate}m</span>
              </div>
            )}
            {commentCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>{commentCount}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{commentCount} comment{commentCount !== 1 ? "s" : ""}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Right: Assignee avatars */}
          {displayedAssignees.length > 0 && (
            <div className="flex items-center -space-x-1.5">
              {displayedAssignees.map((assignee) => (
                <Tooltip key={assignee.userId}>
                  <TooltipTrigger asChild>
                    <Avatar className="h-5 w-5 border-2 border-card">
                      <AvatarImage src={assignee.user.avatarUrl || undefined} alt={assignee.user.name || ""} />
                      <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                        {(assignee.user.name || assignee.user.email || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{assignee.user.name || assignee.user.email}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              {overflowCount > 0 && (
                <div className="h-5 w-5 rounded-full bg-muted border-2 border-card flex items-center justify-center">
                  <span className="text-[8px] text-muted-foreground font-medium">+{overflowCount}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

// Drag overlay version - no interactivity, no data fetching
export function TaskCardOverlay({ task }: { task: TaskResponse }) {
  const formatDueDate = (date: string) => {
    const now = new Date()
    const dueDate = new Date(date)
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
    const diffTime = dueDateOnly.getTime() - nowDate.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { text: "Overdue", bgColor: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" }
    if (diffDays === 0) return { text: "Today", bgColor: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400" }
    if (diffDays === 1) return { text: "Tomorrow", bgColor: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" }
    if (diffDays <= 7) return { text: `${diffDays}d`, bgColor: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" }
    return { text: dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }), bgColor: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" }
  }

  const description = extractTextFromTiptap(task.description)
  const priorityBorder = task.priority && task.priority !== "none"
    ? PRIORITY_BORDER_COLORS[task.priority] || ""
    : ""

  return (
    <div className={cn(
      "flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-xl cursor-grabbing w-[288px]",
      priorityBorder && `border-l-[3px] ${priorityBorder}`
    )}>
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

      <div className="flex items-center gap-2 mt-1 flex-wrap">
        {task.priority && task.priority !== "none" && (
          <div className="flex items-center gap-1">
            <Flag className={cn("h-3 w-3", PRIORITY_FLAG_COLORS[task.priority] || "text-gray-400")} />
            <StatusBadge
              priority={task.priority as "low" | "medium" | "high" | "urgent"}
              variant="priority"
            />
          </div>
        )}

        {task.dueDate && (
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] px-1.5 py-0 font-medium",
              formatDueDate(task.dueDate).bgColor
            )}
          >
            <Calendar className="h-3 w-3 mr-1" />
            {formatDueDate(task.dueDate).text}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
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
