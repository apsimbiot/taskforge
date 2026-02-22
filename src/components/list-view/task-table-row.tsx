"use client"

import * as React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { StatusBadge } from "@/components/status-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { TaskResponse } from "@/lib/api"
import { Calendar, Tag, List, User, Clock } from "lucide-react"

interface TaskTableRowProps {
  task: TaskResponse
  isSelected: boolean
  onSelect: (taskId: string, selected: boolean) => void
  onStatusChange: (taskId: string, status: string) => void
  onClick?: (taskId: string) => void
  assignees?: { userId: string; user: { name: string; avatarUrl?: string } }[]
  listName?: string
  tags?: { id: string; name: string; color: string }[]
}

const STATUS_ORDER = ["todo", "in_progress", "review", "done"]

const STATUS_COLORS: Record<string, string> = {
  todo: "#6b7280",
  in_progress: "#3b82f6",
  review: "#eab308",
  done: "#22c55e",
}

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
}

export function TaskTableRow({
  task,
  isSelected,
  onSelect,
  onStatusChange,
  onClick,
  assignees = [],
  listName,
  tags = [],
}: TaskTableRowProps) {
  const status = task.status || "todo"
  const priority = task.priority || "none"

  const cycleStatus = () => {
    const currentIndex = STATUS_ORDER.indexOf(status)
    const nextStatus = STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length]
    onStatusChange(task.id, nextStatus)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-"
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 border-b border-border/50 hover:bg-accent/30 transition-colors group",
        isSelected && "bg-accent/50"
      )}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onSelect(task.id, !!checked)}
        className="flex-shrink-0"
      />

      {/* Status button */}
      <button
        onClick={cycleStatus}
        className="flex-shrink-0 hover:scale-110 transition-transform"
        title={`Status: ${status}`}
      >
        <div
          className="w-4 h-4 rounded-full border-2"
          style={{
            borderColor: STATUS_COLORS[status] || STATUS_COLORS.todo,
            backgroundColor: status === "done" ? STATUS_COLORS.done : "transparent",
          }}
        />
      </button>

      {/* Name */}
      <div className="flex-1 min-w-[200px]">
        <button
          onClick={() => onClick?.(task.id)}
          className={cn(
            "text-sm truncate block text-left hover:text-primary hover:underline transition-colors cursor-pointer",
            status === "done" && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </button>
      </div>

      {/* Status badge */}
      <div className="w-28 flex-shrink-0">
        <StatusBadge variant="status" status={status as "todo" | "in_progress" | "review" | "done" | null} />
      </div>

      {/* Priority */}
      <div className="w-24 flex-shrink-0">
        {priority !== "none" && (
          <StatusBadge
            variant="priority"
            priority={priority as "low" | "medium" | "high" | "urgent"}
          />
        )}
      </div>

      {/* Due Date */}
      <div
        className={cn(
          "w-24 flex-shrink-0 text-xs flex items-center gap-1",
          isOverdue && "text-red-500 font-medium"
        )}
      >
        {task.dueDate ? (
          <>
            <Calendar className="h-3 w-3" />
            {formatDate(task.dueDate)}
          </>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </div>

      {/* Assignee */}
      <div className="w-24 flex-shrink-0 flex items-center gap-1">
        {assignees.length > 0 ? (
          <div className="flex -space-x-2">
            {assignees.slice(0, 3).map((a) => (
              <Avatar key={a.userId} className="h-6 w-6 border-2 border-background">
                <AvatarImage src={a.user.avatarUrl} />
                <AvatarFallback className="text-xs">
                  {a.user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {assignees.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                +{assignees.length - 3}
              </div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        )}
      </div>

      {/* List */}
      <div className="w-24 flex-shrink-0 text-xs text-muted-foreground truncate" title={listName}>
        {listName || "-"}
      </div>

      {/* Tags */}
      <div className="w-24 flex-shrink-0 flex flex-wrap gap-1">
        {tags.slice(0, 2).map((tag) => (
          <span
            key={tag.id}
            className="px-1.5 py-0.5 rounded text-[10px] text-white truncate"
            style={{ backgroundColor: tag.color }}
            title={tag.name}
          >
            {tag.name}
          </span>
        ))}
        {tags.length > 2 && (
          <span className="text-[10px] text-muted-foreground">+{tags.length - 2}</span>
        )}
      </div>

      {/* Created */}
      <div className="w-20 flex-shrink-0 text-xs text-muted-foreground">
        {formatDate(task.createdAt)}
      </div>

      {/* Updated */}
      <div className="w-20 flex-shrink-0 text-xs text-muted-foreground">
        {formatDate(task.updatedAt)}
      </div>
    </div>
  )
}

export { STATUS_ORDER, STATUS_COLORS, PRIORITY_ORDER }
