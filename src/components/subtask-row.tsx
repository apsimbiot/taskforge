"use client"

import { useState } from "react"
import { SubtaskResponse } from "@/lib/api"
import { useToggleSubtask, useUpdateTask } from "@/hooks/useQueries"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

function getInitials(name: string): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface SubtaskRowProps {
  subtask: SubtaskResponse
  onClick: () => void
  statuses: { id: string; name: string; color: string | null }[]
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300", 
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  low: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  none: "bg-muted text-muted-foreground"
}

export function SubtaskRow({ subtask, onClick, statuses }: SubtaskRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(subtask.title)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  
  const toggleMutation = useToggleSubtask()
  const updateMutation = useUpdateTask()
  
  const handleToggle = () => {
    toggleMutation.mutate({ 
      taskId: subtask.parentTaskId || "",
      subtaskId: subtask.id, 
      completed: subtask.status === "done" 
    })
  }
  
  const handleTitleSubmit = () => {
    if (title !== subtask.title) {
      updateMutation.mutate({ taskId: subtask.id, title })
    }
    setIsEditing(false)
  }

  const handleStatusChange = (statusId: string) => {
    updateMutation.mutate({ taskId: subtask.id, status: statusId })
    setShowStatusMenu(false)
  }
  
  const getCurrentStatus = () => {
    return statuses.find(s => s.id === subtask.status) || statuses[0]
  }
  
  return (
    <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 group border border-transparent hover:border-border/50 transition-all">
      {/* Status checkbox / status indicator */}
      <div className="relative">
        <button
          onClick={handleToggle}
          className="flex-shrink-0 hover:scale-110 transition-transform"
        >
          <div 
            className={cn(
              "w-4 h-4 rounded-full border-2 transition-colors",
              subtask.status === "done" 
                ? "bg-green-500 border-green-500" 
                : "border-muted-foreground hover:border-primary"
            )}
          >
            {subtask.status === "done" && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </button>
        
        {/* Status dropdown */}
        <button
          onClick={() => setShowStatusMenu(!showStatusMenu)}
          className="absolute -inset-2 opacity-0 hover:opacity-100 cursor-pointer"
          title="Change status"
        />
        
        {showStatusMenu && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-background border rounded-md shadow-lg py-1 min-w-[120px]">
            {statuses.map((status) => (
              <button
                key={status.id}
                onClick={() => handleStatusChange(status.id)}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-muted",
                  subtask.status === status.id && "bg-muted"
                )}
              >
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: status.color || "#888" }}
                />
                {status.name}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Title - editable inline */}
      {isEditing ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleSubmit}
          onKeyDown={(e) => e.key === "Enter" && handleTitleSubmit()}
          className="flex-1 bg-background border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      ) : (
        <button 
          onClick={onClick}
          onDoubleClick={() => setIsEditing(true)}
          className={cn(
            "flex-1 text-left text-sm truncate cursor-pointer hover:text-primary transition-colors",
            subtask.status === "done" && "line-through text-muted-foreground"
          )}
        >
          {subtask.title}
        </button>
      )}
      
      {/* Priority */}
      {subtask.priority && subtask.priority !== "none" && (
        <Badge className={cn("text-[10px] h-5 px-1.5", PRIORITY_COLORS[subtask.priority])}>
          {subtask.priority}
        </Badge>
      )}
      
      {/* Due date */}
      {subtask.dueDate && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {new Date(subtask.dueDate).toLocaleDateString()}
        </div>
      )}
      
      {/* Assignees */}
      {subtask.assignees && subtask.assignees.length > 0 && (
        <div className="flex -space-x-1">
          {subtask.assignees.slice(0, 3).map((a) => (
            <Avatar key={a.id} className="h-5 w-5 border border-background">
              <AvatarImage src={a.user.avatarUrl || undefined} />
              <AvatarFallback className="text-[8px]">{getInitials(a.user.name || "")}</AvatarFallback>
            </Avatar>
          ))}
        </div>
      )}
      
      {/* More actions */}
      <div className="relative">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 opacity-0 group-hover:opacity-100"
        >
          <MoreHorizontal className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
