"use client"

import { useMemo, useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Plus, MoreHorizontal, Pencil, Palette, Trash2, ArrowLeft, ArrowRight } from "lucide-react"
import { TaskCard } from "@/components/task-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
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

export interface KanbanColumnProps {
  status: StatusResponse
  tasks: TaskResponse[]
  onTaskClick: (taskId: string) => void
  onQuickAdd?: (title: string) => void
  onTaskDelete?: (taskId: string) => void
  onTaskAssign?: (taskId: string) => void
  onStatusRename?: (statusId: string, newName: string) => void
  onStatusColorChange?: (statusId: string, color: string) => void
  onStatusDelete?: (statusId: string) => void
  onMoveLeft?: (statusId: string) => void
  onMoveRight?: (statusId: string) => void
  canMoveLeft?: boolean
  canMoveRight?: boolean
}

export function KanbanColumn({
  status,
  tasks,
  onTaskClick,
  onQuickAdd,
  onTaskDelete,
  onTaskAssign,
  onStatusRename,
  onStatusColorChange,
  onStatusDelete,
  onMoveLeft,
  onMoveRight,
  canMoveLeft = false,
  canMoveRight = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  })

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks])

  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(status.name)
  const [showNewTaskInput, setShowNewTaskInput] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")

  const handleRename = () => {
    if (editName.trim() && editName !== status.name) {
      onStatusRename?.(status.id, editName.trim())
    }
    setIsEditingName(false)
  }

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
        
        {isEditingName ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename()
              if (e.key === "Escape") {
                setEditName(status.name)
                setIsEditingName(false)
              }
            }}
            className="h-6 text-sm font-semibold"
            autoFocus
          />
        ) : (
          <span className="text-sm font-semibold truncate">{status.name}</span>
        )}
        
        <Badge variant="secondary" className="ml-auto text-xs">
          {tasks.length}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setIsEditingName(true)
              setEditName(status.name)
            }}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Palette className="h-4 w-4 mr-2" />
                Change Color
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <div className="grid grid-cols-4 gap-2 p-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      className={cn(
                        "w-6 h-6 rounded-full transition-transform hover:scale-110",
                        status.color === color.value && "ring-2 ring-offset-2 ring-primary"
                      )}
                      style={{ backgroundColor: color.value }}
                      onClick={() => onStatusColorChange?.(status.id, color.value)}
                      title={color.name}
                    />
                  ))}
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={() => onMoveLeft?.(status.id)}
              disabled={!canMoveLeft}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Move Left
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onMoveRight?.(status.id)}
              disabled={!canMoveRight}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Move Right
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={() => {
                if (tasks.length === 0 || confirm(`This column has ${tasks.length} task(s). Are you sure you want to delete it?`)) {
                  onStatusDelete?.(status.id)
                }
              }}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
              onDelete={onTaskDelete}
              onAssign={onTaskAssign}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border-2 border-dashed border-border/50 rounded-lg">
            Drop tasks here
          </div>
        )}
      </div>

      {/* Quick Add Task */}
      <div className="p-2 border-t">
        {showNewTaskInput ? (
          <div className="space-y-2">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task name..."
              className="h-8"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTaskTitle.trim()) {
                  onQuickAdd?.(newTaskTitle.trim())
                  setNewTaskTitle("")
                  setShowNewTaskInput(false)
                }
                if (e.key === "Escape") {
                  setShowNewTaskInput(false)
                  setNewTaskTitle("")
                }
              }}
            />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => {
                  if (newTaskTitle.trim()) {
                    onQuickAdd?.(newTaskTitle.trim())
                    setNewTaskTitle("")
                    setShowNewTaskInput(false)
                  }
                }}
              >
                Add
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => {
                  setShowNewTaskInput(false)
                  setNewTaskTitle("")
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => setShowNewTaskInput(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add task
          </Button>
        )}
      </div>
    </div>
  )
}
