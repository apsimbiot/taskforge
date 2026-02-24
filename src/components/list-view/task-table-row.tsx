"use client"

import * as React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { StatusBadge } from "@/components/status-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { TaskResponse } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Calendar as CalendarIcon, Plus, ChevronRight, ChevronDown, Pencil, ListPlus } from "lucide-react"

export interface TaskTableRowProps {
  task: TaskResponse
  isSelected: boolean
  onSelect: (taskId: string, selected: boolean) => void
  onStatusChange: (taskId: string, status: string) => void
  onClick?: (taskId: string) => void
  assignees?: { userId: string; user: { name: string; avatarUrl?: string } }[]
  listName?: string
  tags?: { id: string; name: string; color: string }[]
  workspaceId?: string
  workspaceMembers?: { id: string; name: string | null; email: string; avatarUrl: string | null }[]
  taskAssignees?: { userId: string; user: { id: string; name: string | null; email: string; avatarUrl: string | null } }[]
  onPriorityChange?: (taskId: string, priority: string) => void
  onDueDateChange?: (taskId: string, date: string | undefined) => void
  onAssigneeAdd?: (taskId: string, userId: string) => void
  onAssigneeRemove?: (taskId: string, userId: string) => void
  onRename?: (taskId: string, newTitle: string) => void
  onAddSubtask?: (parentTaskId: string) => void
  // New props for nested tasks
  depth?: number
  hasChildren?: boolean
  childCount?: number
  isExpanded?: boolean
  onToggleExpand?: (taskId: string) => void
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
  workspaceId,
  workspaceMembers = [],
  taskAssignees = [],
  onPriorityChange,
  onDueDateChange,
  onAssigneeAdd,
  onAssigneeRemove,
  onRename,
  onAddSubtask,
  depth = 0,
  hasChildren = false,
  childCount = 0,
  isExpanded = false,
  onToggleExpand,
}: TaskTableRowProps) {
  const status = task.status || "todo"
  const priority = task.priority || "none"
  const [assigneeSearch, setAssigneeSearch] = React.useState("")
  const [isEditing, setIsEditing] = React.useState(false)
  const [editTitle, setEditTitle] = React.useState(task.title)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const cycleStatus = () => {
    const currentIndex = STATUS_ORDER.indexOf(status)
    const nextStatus = STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length]
    onStatusChange(task.id, nextStatus)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()

  // Filter workspace members based on search
  const filteredMembers = workspaceMembers.filter(
    (member) =>
      member.name?.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
      member.email.toLowerCase().includes(assigneeSearch.toLowerCase())
  )

  // Check if a member is assigned to this task
  const isMemberAssigned = (memberId: string) =>
    taskAssignees.some((a) => a.userId === memberId)

  // Handle date change
  const handleDateSelect = (date: Date | undefined) => {
    if (onDueDateChange) {
      onDueDateChange(task.id, date ? date.toISOString() : undefined)
    }
  }

  const dueDate = task.dueDate ? new Date(task.dueDate) : undefined

  // Calculate indentation — spacer width (depth 0 = 8px, depth 1 = 32px, etc.)
  const indentWidth = depth * 28 + 8

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 border-b border-border/50 hover:bg-accent/30 transition-colors group",
        isSelected && "bg-accent/50",
        depth > 0 && "bg-muted/20"
      )}
    >
      {/* Indentation spacer — pushes all content including columns */}
      <div style={{ width: `${indentWidth}px` }} className="flex-shrink-0" />

      {/* Visual connector line for subtasks */}
      {depth > 0 && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-px bg-border" 
          style={{ left: `${indentWidth - 4}px` }}
        />
      )}

      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onSelect(task.id, !!checked)}
        className="flex-shrink-0"
      />

      {/* Expand/collapse button for tasks with children */}
      {hasChildren ? (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand?.(task.id)
          }}
          className="flex-shrink-0 p-0.5 hover:bg-accent rounded transition-colors"
          title={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      ) : (
        <div className="w-5 flex-shrink-0" />
      )}

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
      <div className="flex-1 min-w-[200px] flex items-center gap-1">
        {isEditing ? (
          <Input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={() => {
              if (editTitle.trim() && editTitle !== task.title) {
                onRename?.(task.id, editTitle.trim())
              } else {
                setEditTitle(task.title)
              }
              setIsEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (editTitle.trim() && editTitle !== task.title) {
                  onRename?.(task.id, editTitle.trim())
                }
                setIsEditing(false)
              }
              if (e.key === "Escape") {
                setEditTitle(task.title)
                setIsEditing(false)
              }
            }}
            className="h-7 text-sm px-1 py-0"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <button
            onClick={() => onClick?.(task.id)}
            className={cn(
              "text-sm truncate block text-left hover:text-primary hover:underline transition-colors cursor-pointer",
              status === "done" && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </button>
        )}
        {/* Subtask count badge */}
        {hasChildren && !isEditing && (
          <Badge variant="secondary" className="text-[10px] ml-1 h-5 px-1.5">
            {childCount}
          </Badge>
        )}

        {/* Hover action buttons */}
        {!isEditing && (
          <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditTitle(task.title)
                setIsEditing(true)
              }}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Rename task"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {onAddSubtask && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onAddSubtask(task.id)
                }}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Add subtask"
              >
                <ListPlus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Status badge */}
      <div className="w-28 flex-shrink-0">
        {onStatusChange ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center justify-start cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5">
                <StatusBadge variant="status" status={status as "todo" | "in_progress" | "review" | "done" | null} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onStatusChange(task.id, "todo")}>
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: STATUS_COLORS.todo }} />
                To Do
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(task.id, "in_progress")}>
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: STATUS_COLORS.in_progress }} />
                In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(task.id, "review")}>
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: STATUS_COLORS.review }} />
                Review
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(task.id, "done")}>
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: STATUS_COLORS.done }} />
                Done
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <StatusBadge variant="status" status={status as "todo" | "in_progress" | "review" | "done" | null} />
        )}
      </div>

      {/* Priority */}
      <div className="w-24 flex-shrink-0">
        {onPriorityChange ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center justify-start cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5">
                {priority !== "none" && (
                  <StatusBadge
                    variant="priority"
                    priority={priority as "low" | "medium" | "high" | "urgent"}
                  />
                )}
                {priority === "none" && (
                  <span className="text-xs text-muted-foreground">Set</span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => onPriorityChange(task.id, "urgent")}>
                🔴 Urgent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPriorityChange(task.id, "high")}>
                🟠 High
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPriorityChange(task.id, "medium")}>
                🔵 Medium
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPriorityChange(task.id, "low")}>
                ⚪ Low
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPriorityChange(task.id, "none")}>
                None
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          priority !== "none" && (
            <StatusBadge
              variant="priority"
              priority={priority as "low" | "medium" | "high" | "urgent"}
            />
          )
        )}
      </div>

      {/* Due Date */}
      {onDueDateChange ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "w-24 flex-shrink-0 text-xs flex items-center gap-1 cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5",
                isOverdue && "text-red-500 font-medium"
              )}
            >
              {task.dueDate ? (
                <>
                  <CalendarIcon className="h-3 w-3" />
                  {formatDate(task.dueDate)}
                </>
              ) : (
                <span className="text-muted-foreground">Set date</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={handleDateSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      ) : (
        <div
          className={cn(
            "w-24 flex-shrink-0 text-xs flex items-center gap-1",
            isOverdue && "text-red-500 font-medium"
          )}
        >
          {task.dueDate ? (
            <>
              <CalendarIcon className="h-3 w-3" />
              {formatDate(task.dueDate)}
            </>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      )}

      {/* Assignee */}
      {onAssigneeAdd && onAssigneeRemove ? (
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-24 flex-shrink-0 flex items-center gap-1 cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5">
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
                <Plus className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search members..."
                value={assigneeSearch}
                onValueChange={setAssigneeSearch}
              />
              <CommandList>
                <CommandEmpty>No members found.</CommandEmpty>
                <CommandGroup>
                  {filteredMembers.map((member) => {
                    const isAssigned = isMemberAssigned(member.id)
                    return (
                      <CommandItem
                        key={member.id}
                        value={member.name || member.email}
                        onSelect={() => {
                          if (isAssigned) {
                            onAssigneeRemove(task.id, member.id)
                          } else {
                            onAssigneeAdd(task.id, member.id)
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {member.name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate">
                          {member.name || member.email}
                        </span>
                        {isAssigned && (
                          <span className="text-green-500">✓</span>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
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
      )}

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
