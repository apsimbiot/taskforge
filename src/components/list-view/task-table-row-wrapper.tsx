"use client"

import { TaskTableRow } from "./task-table-row"
import { useTaskAssignees } from "@/hooks/useQueries"
import type { TaskResponse } from "@/lib/api"

interface TaskTableRowWrapperProps {
  task: TaskResponse
  isSelected: boolean
  onSelect: (taskId: string, selected: boolean) => void
  onStatusChange: (taskId: string, status: string) => void
  onClick?: (taskId: string) => void
  workspaceId?: string
  workspaceMembers?: { id: string; name: string | null; email: string; avatarUrl: string | null }[]
  onPriorityChange?: (taskId: string, priority: string) => void
  onDueDateChange?: (taskId: string, date: string | undefined) => void
  onAssigneeAdd?: (taskId: string, userId: string) => void
  onAssigneeRemove?: (taskId: string, userId: string) => void
  // New props for nested tasks
  depth?: number
  hasChildren?: boolean
  childCount?: number
  isExpanded?: boolean
  onToggleExpand?: (taskId: string) => void
}

export function TaskTableRowWrapper(props: TaskTableRowWrapperProps) {
  const { data: taskAssignees = [] } = useTaskAssignees(props.task.id)

  // Transform TaskAssigneeResponse to the format expected by TaskTableRow's assignees prop
  const assignees = taskAssignees.map((ta) => ({
    userId: ta.userId,
    user: {
      name: ta.user.name || ta.user.email,
      avatarUrl: ta.user.avatarUrl || undefined,
    },
  }))

  return <TaskTableRow {...props} assignees={assignees} />
}
