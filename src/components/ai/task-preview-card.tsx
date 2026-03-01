"use client"

import React, { useState } from "react"
import { X, GripVertical, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export interface GeneratedTask {
  id: string
  title: string
  description: string
  priority: "urgent" | "high" | "medium" | "low"
  effort?: string
  subtasks?: string[]
}

interface TaskPreviewCardProps {
  task: GeneratedTask
  onUpdate: (id: string, updates: Partial<GeneratedTask>) => void
  onDelete: (id: string) => void
}

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "🔴 Urgent" },
  { value: "high", label: "🟠 High" },
  { value: "medium", label: "🟡 Medium" },
  { value: "low", label: "🟢 Low" },
]

export function TaskPreviewCard({ task, onUpdate, onDelete }: TaskPreviewCardProps) {
  const [showSubtasks, setShowSubtasks] = useState(false)
  const [newSubtask, setNewSubtask] = useState("")

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return
    const updatedSubtasks = [...(task.subtasks || []), newSubtask.trim()]
    onUpdate(task.id, { subtasks: updatedSubtasks })
    setNewSubtask("")
  }

  const handleRemoveSubtask = (index: number) => {
    const updatedSubtasks = (task.subtasks || []).filter((_, i) => i !== index)
    onUpdate(task.id, { subtasks: updatedSubtasks })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddSubtask()
    }
  }

  return (
    <div className="flex items-start gap-3 p-4 bg-background border rounded-lg hover:border-primary/50 transition-colors group">
      {/* Drag handle */}
      <div className="mt-2 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3">
        {/* Title */}
        <Input
          value={task.title}
          onChange={(e) => onUpdate(task.id, { title: e.target.value })}
          placeholder="Task title"
          className="font-medium"
        />

        {/* Description */}
        <Textarea
          value={task.description}
          onChange={(e) => onUpdate(task.id, { description: e.target.value })}
          placeholder="Task description (optional)"
          className="min-h-[60px] resize-none text-sm"
        />

        {/* Priority and Effort Row */}
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={task.priority}
            onValueChange={(value: "urgent" | "high" | "medium" | "low") =>
              onUpdate(task.id, { priority: value })
            }
          >
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Effort Input */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Effort:</span>
            <Input
              value={task.effort || ""}
              onChange={(e) => onUpdate(task.id, { effort: e.target.value })}
              placeholder="e.g., 2h, 1d"
              className="w-[100px] h-8 text-sm"
            />
          </div>
        </div>

        {/* Subtasks Section */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowSubtasks(!showSubtasks)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showSubtasks ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span>
              Subtasks ({(task.subtasks || []).length})
            </span>
          </button>

          {showSubtasks && (
            <div className="ml-5 space-y-2">
              {/* Existing subtasks */}
              {(task.subtasks || []).map((subtask, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 group/subtask"
                >
                  <span className="text-sm flex-1">{subtask}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(index)}
                    className="opacity-0 group-hover/subtask:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Add new subtask */}
              <div className="flex items-center gap-2">
                <Input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a subtask..."
                  className="h-7 text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddSubtask}
                  disabled={!newSubtask.trim()}
                  className="h-7 px-2"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={() => onDelete(task.id)}
        className="mt-1 p-1 text-muted-foreground hover:text-destructive rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
