"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronDown, Trash2, UserPlus, Tag, Flag, Circle } from "lucide-react"

interface BulkActionsBarProps {
  selectedCount: number
  selectedTasks: Set<string>
  onClearSelection: () => void
  onStatusChange: (taskIds: string[], status: string) => void
  onPriorityChange: (taskIds: string[], priority: string) => void
  onAssigneeAdd: (taskIds: string[], userId: string) => void
  onLabelAdd: (taskIds: string[], labelId: string) => void
  onDelete: (taskIds: string[]) => void
  availableStatuses: { value: string; label: string; color: string }[]
  availablePriorities: { value: string; label: string }[]
  availableAssignees: { value: string; label: string }[]
  availableLabels: { value: string; label: string; color: string }[]
}

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do", color: "#6b7280" },
  { value: "in_progress", label: "In Progress", color: "#3b82f6" },
  { value: "review", label: "Review", color: "#eab308" },
  { value: "done", label: "Done", color: "#22c55e" },
]

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "🔴 Urgent" },
  { value: "high", label: "🟠 High" },
  { value: "medium", label: "🟡 Medium" },
  { value: "low", label: "🟢 Low" },
  { value: "none", label: "⚪ None" },
]

export function BulkActionsBar({
  selectedCount,
  selectedTasks,
  onClearSelection,
  onStatusChange,
  onPriorityChange,
  onAssigneeAdd,
  onLabelAdd,
  onDelete,
  availableStatuses,
  availablePriorities,
  availableAssignees,
  availableLabels,
}: BulkActionsBarProps) {
  const taskIds = Array.from(selectedTasks)

  if (selectedCount === 0) return null

  const statuses = availableStatuses.length > 0 ? availableStatuses : STATUS_OPTIONS
  const priorities = availablePriorities.length > 0 ? availablePriorities : PRIORITY_OPTIONS

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
      <div className="flex items-center gap-4 px-6 py-3">
        {/* Selected count */}
        <div className="flex items-center gap-2">
          <Checkbox
            checked={true}
            onCheckedChange={() => onClearSelection()}
            className="cursor-pointer"
          />
          <span className="text-sm font-medium">{selectedCount} selected</span>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Set Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8">
              <Circle className="h-4 w-4 mr-2" />
              Set Status
              <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {statuses.map((status) => (
              <DropdownMenuItem
                key={status.value}
                onClick={() => onStatusChange(taskIds, status.value)}
              >
                <span
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: status.color }}
                />
                {status.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Set Priority */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8">
              <Flag className="h-4 w-4 mr-2" />
              Set Priority
              <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {priorities.map((priority) => (
              <DropdownMenuItem
                key={priority.value}
                onClick={() => onPriorityChange(taskIds, priority.value)}
              >
                {priority.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add Assignee */}
        {availableAssignees.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Assignee
                <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {availableAssignees.map((assignee) => (
                <DropdownMenuItem
                  key={assignee.value}
                  onClick={() => onAssigneeAdd(taskIds, assignee.value)}
                >
                  {assignee.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Add Label */}
        {availableLabels.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                <Tag className="h-4 w-4 mr-2" />
                Add Label
                <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {availableLabels.map((label) => (
                <DropdownMenuItem
                  key={label.value}
                  onClick={() => onLabelAdd(taskIds, label.value)}
                >
                  <span
                    className="w-3 h-3 rounded mr-2"
                    style={{ backgroundColor: label.color }}
                  />
                  {label.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="flex-1" />

        {/* Delete */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => onDelete(taskIds)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>

        {/* Clear */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={onClearSelection}
        >
          Clear
        </Button>
      </div>
    </div>
  )
}
