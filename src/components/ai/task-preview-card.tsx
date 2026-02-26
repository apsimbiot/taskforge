"use client"

import React from "react"
import { X, GripVertical } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface GeneratedTask {
  id: string
  title: string
  description: string
  priority: "urgent" | "high" | "medium" | "low"
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

        {/* Priority */}
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={() => onDelete(task.id)}
        className="mt-1 p-1 text-muted-foreground hover:text-destructive rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
