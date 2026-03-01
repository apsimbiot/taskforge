"use client"

import React, { use, useState, useCallback, useMemo, useEffect } from "react"
import {
  Plus,
  List,
  LayoutGrid,
  GanttChart,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  Check,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Breadcrumb } from "@/components/breadcrumb"
import { StatusBadge } from "@/components/status-badge"
import { TimeTracker } from "@/components/time-tracker"
import { KanbanBoard } from "@/components/kanban-board"
import { TaskDetailPanel } from "@/components/task-detail-panel"
import { useTaskPanel } from "@/store/useTaskPanel"
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useStatuses, useWorkspaceMembers, useAddTaskAssignee, useRemoveTaskAssignee, useList } from "@/hooks/useQueries"
import { cn } from "@/lib/utils"
import type { TaskResponse } from "@/lib/api"
import { buildTaskTree, flattenTree, type TaskTreeNode } from "@/lib/task-tree"

// Import new list view components
import { GroupByDropdown } from "@/components/list-view/group-by-dropdown"
import { SortDropdown, PRIORITY_ORDER } from "@/components/list-view/sort-dropdown"
import { FilterPopover, type FilterState } from "@/components/list-view/filter-popover"
import { TaskTableRowWrapper } from "@/components/list-view/task-table-row-wrapper"
import { BulkActionsBar } from "@/components/list-view/bulk-actions-bar"
import { AIGenerateModal } from "@/components/ai/aigenerate-modal"
import { TimelineView } from "@/components/timeline-view/TimelineView"
import { CalendarView } from "@/components/calendar-view"

type ViewMode = "list" | "board" | "gantt" | "calendar"
type GroupByOption = "status" | "priority" | "assignee" | "dueDate" | "label" | null
type SortByOption = "dueDate" | "priority" | "name" | "createdAt" | "updatedAt"
type SortOrder = "asc" | "desc"

// Default status options (fallback when no custom statuses)
const DEFAULT_STATUSES = [
  { value: "todo", label: "To Do", color: "#6b7280" },
  { value: "in_progress", label: "In Progress", color: "#3b82f6" },
  { value: "review", label: "Review", color: "#eab308" },
  { value: "done", label: "Done", color: "#22c55e" },
]

const DEFAULT_PRIORITIES = [
  { value: "urgent", label: "🔴 Urgent" },
  { value: "high", label: "🟠 High" },
  { value: "medium", label: "🟡 Medium" },
  { value: "low", label: "🟢 Low" },
  { value: "none", label: "⚪ None" },
]

// Group header component for grouped views
function GroupHeader({
  title,
  count,
  isCollapsed,
  onToggle,
}: {
  title: string
  count: number
  isCollapsed: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 w-full px-4 py-2 bg-muted/50 hover:bg-muted transition-colors text-left"
    >
      {isCollapsed ? (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      )}
      <span className="font-medium text-sm">{title}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </button>
  )
}

// Filter chips component
function FilterChips({
  filters,
  onRemoveFilter,
}: {
  filters: FilterState
  onRemoveFilter: (key: keyof FilterState, value?: string) => void
}) {
  const chips: { key: keyof FilterState; label: string; value?: string }[] = []

  filters.status.forEach((status) => {
    const statusInfo = DEFAULT_STATUSES.find((s) => s.value === status)
    chips.push({ key: "status", label: statusInfo?.label || status, value: status })
  })

  filters.priority.forEach((priority) => {
    const priorityInfo = DEFAULT_PRIORITIES.find((p) => p.value === priority)
    chips.push({ key: "priority", label: priorityInfo?.label || priority, value: priority })
  })

  if (filters.dueDateRange) {
    chips.push({
      key: "dueDateRange",
      label: `Due: ${filters.dueDateRange.start} - ${filters.dueDateRange.end}`,
    })
  }

  filters.labels.forEach((label) => {
    chips.push({ key: "labels", label, value: label })
  })

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 px-4 py-2 border-b">
      {chips.map((chip, index) => (
        <span
          key={`${chip.key}-${chip.value}-${index}`}
          className="inline-flex items-center gap-1 text-xs bg-accent px-2 py-1 rounded-full"
        >
          {chip.label}
          <button
            onClick={() => onRemoveFilter(chip.key, chip.value)}
            className="hover:text-destructive"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  )
}

// Inline new task row component
function InlineSubtaskInput({
  depth,
  onSubmit,
  onCancel,
}: {
  depth: number
  onSubmit: (title: string) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div
      className="flex items-center gap-2 px-4 py-1.5 border-b border-border/50 bg-accent/20"
    >
      <div style={{ width: `${depth * 28 + 8}px` }} className="flex-shrink-0" />
      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/40 flex-shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) {
            onSubmit(title.trim())
            setTitle("")
            // Keep focus for adding more subtasks
            setTimeout(() => inputRef.current?.focus(), 50)
          }
          if (e.key === "Escape") {
            onCancel()
          }
        }}
        onBlur={() => {
          if (title.trim()) {
            onSubmit(title.trim())
          }
          onCancel()
        }}
        placeholder="Type subtask name and press Enter..."
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
      />
      <span className="text-xs text-muted-foreground">Enter to save · Esc to cancel</span>
    </div>
  )
}

function InlineNewTaskRow({
  listId,
  defaultStatus,
  defaultPriority,
  onCreateTask,
}: {
  listId: string
  defaultStatus?: string
  defaultPriority?: string
  onCreateTask: (data: { listId: string; title: string; status?: string; priority?: string }) => void
}) {
  const [title, setTitle] = useState("")

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 hover:bg-accent/20">
      <Plus className="h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="+ New task..."
        className="border-0 bg-transparent focus-visible:ring-0 text-sm h-7"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) {
            onCreateTask({
              listId,
              title: title.trim(),
              status: defaultStatus,
              priority: defaultPriority,
            })
            setTitle("")
          }
        }}
      />
    </div>
  )
}

export default function ListPage({
  params,
}: {
  params: Promise<{ id: string; spaceId: string; listId: string }>
}) {
  const { id: workspaceId, spaceId, listId } = use(params)
  const { data: list, isLoading: isListLoading } = useList(listId)
  const { data: tasks, isLoading } = useTasks(listId)
  const { data: statuses } = useStatuses(listId)
  const createTaskMutation = useCreateTask()
  const updateTaskMutation = useUpdateTask()
  const deleteTaskMutation = useDeleteTask()
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceId)
  const addTaskAssigneeMutation = useAddTaskAssignee()
  const removeTaskAssigneeMutation = useRemoveTaskAssignee()

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("list")

  // New task input state
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [showNewTask, setShowNewTask] = useState(false)
  const [showAIGenerate, setShowAIGenerate] = useState(false)

  // List view state
  const [groupBy, setGroupBy] = useState<GroupByOption>(null)
  const [sortBy, setSortBy] = useState<SortByOption>("dueDate")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const [filters, setFilters] = useState<FilterState>({
    status: [],
    priority: [],
    assigneeIds: [],
    dueDateRange: null,
    labels: [],
  })
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const { selectedTaskId, setSelectedTask, isOpen: isTaskPanelOpen, close: closeTaskPanel } = useTaskPanel()

  // Sync panel state with browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      const taskMatch = path.match(/\/tasks\/([a-f0-9-]+)/)
      if (taskMatch) {
        // Forward navigation to a task URL — open the panel
        setSelectedTask(taskMatch[1])
      } else {
        // Back navigation away from task URL — close the panel
        closeTaskPanel()
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [setSelectedTask, closeTaskPanel])

  // Map status names to standard values (To Do -> todo, Done -> done, etc.)
  const STATUS_VALUE_MAP: Record<string, string> = {
    "to do": "todo",
    "todo": "todo",
    "in progress": "in_progress",
    "in_progress": "in_progress",
    "review": "review",
    "in review": "review",
    "done": "done",
    "closed": "closed",
  }

  // Available filter options (from API or defaults)
  const availableStatuses = statuses && statuses.length > 0
    ? statuses.map((s) => {
        const normalizedName = s.name.toLowerCase().trim()
        const value = STATUS_VALUE_MAP[normalizedName] || normalizedName.replace(" ", "_")
        return { value, label: s.name, color: s.color || "#6b7280" }
      })
    : DEFAULT_STATUSES
  const availablePriorities = DEFAULT_PRIORITIES

  // Filter tasks (including subtasks)
  const filteredTasks = useMemo(() => {
    if (!tasks) return []

    let result = [...tasks]

    // Apply filters
    if (filters.status.length > 0) {
      result = result.filter((t) => filters.status.includes(t.status || "todo"))
    }
    if (filters.priority.length > 0) {
      result = result.filter((t) => filters.priority.includes(t.priority || "none"))
    }
    // Note: assigneeIds and labels would need API data
    if (filters.dueDateRange) {
      const start = filters.dueDateRange.start ? new Date(filters.dueDateRange.start) : null
      const end = filters.dueDateRange.end ? new Date(filters.dueDateRange.end) : null
      result = result.filter((t) => {
        if (!t.dueDate) return false
        const dueDate = new Date(t.dueDate)
        if (start && dueDate < start) return false
        if (end && dueDate > end) return false
        return true
      })
    }

    return result
  }, [tasks, filters])

  // Apply sorting to filtered tasks
  const sortedTasks = useMemo(() => {
    const result = [...filteredTasks]

    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "dueDate":
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
          comparison = dateA - dateB
          break
        case "priority":
          const priorityA = PRIORITY_ORDER[a.priority || "none"] || 0
          const priorityB = PRIORITY_ORDER[b.priority || "none"] || 0
          comparison = priorityB - priorityA // Higher priority first
          break
        case "name":
          comparison = (a.title || "").localeCompare(b.title || "")
          break
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case "updatedAt":
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
      }
      return sortOrder === "asc" ? comparison : -comparison
    })

    return result
  }, [filteredTasks, sortBy, sortOrder])

  // Build task tree from filtered and sorted tasks
  const taskTree = useMemo(() => buildTaskTree(sortedTasks), [sortedTasks])

  // Flatten tree based on expanded state for rendering
  const flatTasks = useMemo(() => flattenTree(taskTree, expandedTasks), [taskTree, expandedTasks])

  // For display count - use filtered tasks (not flatTasks which excludes collapsed subtasks)
  const displayTaskCount = filteredTasks.length

  // Group root tasks if grouping is enabled (subtasks are nested under their parent)
  const groupedTasks = useMemo(() => {
    // Use flatTasks to respect expanded/collapsed state
    // Only root tasks (depth 0) get grouped - subtasks appear under their parent
    const rootTasks = taskTree.filter(t => t.depth === 0)
    
    if (!groupBy) return { ungrouped: rootTasks }

    const groups: Record<string, TaskTreeNode[]> = {}

    rootTasks.forEach((task) => {
      let groupKey = "unknown"
      switch (groupBy) {
        case "status":
          groupKey = task.status || "todo"
          break
        case "priority":
          groupKey = task.priority || "none"
          break
        case "dueDate":
          if (!task.dueDate) {
            groupKey = "no_due_date"
          } else {
            const date = new Date(task.dueDate)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const tomorrow = new Date(today)
            tomorrow.setDate(tomorrow.getDate() + 1)
            const nextWeek = new Date(today)
            nextWeek.setDate(nextWeek.getDate() + 7)

            if (date < today) groupKey = "overdue"
            else if (date.toDateString() === today.toDateString()) groupKey = "today"
            else if (date.toDateString() === tomorrow.toDateString()) groupKey = "tomorrow"
            else if (date < nextWeek) groupKey = "this_week"
            else groupKey = "later"
          }
          break
        // case "assignee": would need API data
        // case "label": would need API data
      }
      if (!groups[groupKey]) groups[groupKey] = []
      groups[groupKey].push(task)
    })

    return groups
  }, [taskTree, groupBy])

  // Handlers
  const handleCreateTask = useCallback(() => {
    if (!newTaskTitle.trim()) return
    createTaskMutation.mutate({
      listId,
      title: newTaskTitle.trim(),
      status: "todo",
      priority: "medium",
    })
    setNewTaskTitle("")
    setShowNewTask(false)
  }, [newTaskTitle, listId, createTaskMutation])

  const handleStatusChange = useCallback(
    (taskId: string, status: string) => {
      updateTaskMutation.mutate({ taskId, status })
    },
    [updateTaskMutation]
  )

  const handlePriorityChange = useCallback(
    (taskId: string, priority: string) => {
      updateTaskMutation.mutate({ taskId, priority })
    },
    [updateTaskMutation]
  )

  const handleDueDateChange = useCallback(
    (taskId: string, date: string | undefined) => {
      updateTaskMutation.mutate({ taskId, dueDate: date })
    },
    [updateTaskMutation]
  )

  const handleAssigneeAdd = useCallback(
    (taskId: string, userId: string) => {
      addTaskAssigneeMutation.mutate({ taskId, userId })
    },
    [addTaskAssigneeMutation]
  )

  const handleAssigneeRemove = useCallback(
    (taskId: string, userId: string) => {
      removeTaskAssigneeMutation.mutate({ taskId, userId })
    },
    [removeTaskAssigneeMutation]
  )

  const handleRename = useCallback(
    (taskId: string, newTitle: string) => {
      updateTaskMutation.mutate({ taskId, title: newTitle })
    },
    [updateTaskMutation]
  )

  // Track which parent task has an active subtask input
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null)

  const handleAddSubtask = useCallback(
    (parentTaskId: string) => {
      // Auto-expand the parent so the input row is visible
      setExpandedTasks((prev) => {
        const next = new Set(prev)
        next.add(parentTaskId)
        return next
      })
      setAddingSubtaskFor(parentTaskId)
    },
    []
  )

  const handleCreateSubtask = useCallback(
    (parentTaskId: string, title: string) => {
      createTaskMutation.mutate({
        listId,
        title,
        parentTaskId,
        status: "todo",
      })
      setAddingSubtaskFor(null)
    },
    [createTaskMutation, listId]
  )

  const handleBulkStatusChange = useCallback(
    (taskIds: string[], status: string) => {
      taskIds.forEach((taskId) => {
        updateTaskMutation.mutate({ taskId, status })
      })
      setSelectedTasks(new Set())
    },
    [updateTaskMutation]
  )

  const handleBulkPriorityChange = useCallback(
    (taskIds: string[], priority: string) => {
      taskIds.forEach((taskId) => {
        updateTaskMutation.mutate({ taskId, priority })
      })
      setSelectedTasks(new Set())
    },
    [updateTaskMutation]
  )

  const handleBulkDelete = useCallback(
    (taskIds: string[]) => {
      taskIds.forEach((taskId) => {
        deleteTaskMutation.mutate(taskId)
      })
      setSelectedTasks(new Set())
    },
    [deleteTaskMutation]
  )

  const handleTaskSelect = useCallback((taskId: string, selected: boolean) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(taskId)
      } else {
        next.delete(taskId)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        setSelectedTasks(new Set(flatTasks.map((t) => t.id)))
      } else {
        setSelectedTasks(new Set())
      }
    },
    [flatTasks]
  )

  const handleClearSelection = useCallback(() => {
    setSelectedTasks(new Set())
  }, [])

  const handleRemoveFilter = useCallback(
    (key: keyof FilterState, value?: string) => {
      setFilters((prev) => {
        if (value !== undefined) {
          // Remove specific value
          if (Array.isArray(prev[key])) {
            return { ...prev, [key]: (prev[key] as string[]).filter((v) => v !== value) }
          }
        } else {
          // Clear entire filter
          if (key === "dueDateRange") {
            return { ...prev, [key]: null }
          } else if (Array.isArray(prev[key])) {
            return { ...prev, [key]: [] }
          }
        }
        return prev
      })
    },
    []
  )

  const toggleGroupCollapse = useCallback((groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }, [])

  // Toggle expand/collapse for nested subtasks
  const toggleExpand = useCallback((taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }, [])

  // Get group display name
  const getGroupName = (key: string) => {
    switch (key) {
      case "todo": return "To Do"
      case "in_progress": return "In Progress"
      case "review": return "Review"
      case "done": return "Done"
      case "urgent": return "🔴 Urgent"
      case "high": return "🟠 High"
      case "medium": return "🟡 Medium"
      case "low": return "🟢 Low"
      case "none": return "⚪ None"
      case "overdue": return "Overdue"
      case "today": return "Today"
      case "tomorrow": return "Tomorrow"
      case "this_week": return "This Week"
      case "later": return "Later"
      case "no_due_date": return "No Due Date"
      default: return key
    }
  }

  // Group order for display
  const STATUS_ORDER = ["todo", "in_progress", "review", "done"]
  const PRIORITY_GROUP_ORDER = ["urgent", "high", "medium", "low", "none"]
  const DUE_DATE_ORDER = ["overdue", "today", "tomorrow", "this_week", "later", "no_due_date"]

  const getSortedGroupKeys = (groups: Record<string, TaskResponse[]>) => {
    const keys = Object.keys(groups)
    if (groupBy === "status") {
      return keys.sort((a, b) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b))
    }
    if (groupBy === "priority") {
      return keys.sort((a, b) => PRIORITY_GROUP_ORDER.indexOf(a) - PRIORITY_GROUP_ORDER.indexOf(b))
    }
    if (groupBy === "dueDate") {
      return keys.sort((a, b) => DUE_DATE_ORDER.indexOf(a) - DUE_DATE_ORDER.indexOf(b))
    }
    return keys.sort()
  }

  // Calculate if we need padding for the bulk actions bar
  const hasSelectedTasks = selectedTasks.size > 0
  const contentPaddingBottom = hasSelectedTasks ? "pb-20" : ""

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <Breadcrumb
          items={[
            { label: "Workspace", href: `/dashboard/workspaces/${workspaceId}` },
            {
              label: "Space",
              href: `/dashboard/workspaces/${workspaceId}/spaces/${spaceId}`,
            },
            { label: "List" },
          ]}
          className="mb-2"
        />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{isListLoading ? "Loading..." : list?.name || "List"}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {displayTaskCount} task{displayTaskCount !== 1 ? "s" : ""}
              {displayTaskCount !== (tasks?.length || 0) && (
                <span className="text-muted-foreground">
                  {" "}(filtered from {tasks?.length || 0})
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TimeTracker className="mr-2" />
            <div className="flex items-center border rounded-md overflow-hidden">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none h-8"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
              <Button
                variant={viewMode === "board" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none h-8"
                onClick={() => setViewMode("board")}
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Board
              </Button>
              <Button
                variant={viewMode === "gantt" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none h-8"
                onClick={() => setViewMode("gantt")}
              >
                <GanttChart className="h-4 w-4 mr-1" />
                Gantt
              </Button>
              <Button
                variant={viewMode === "calendar" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-none h-8"
                onClick={() => setViewMode("calendar")}
              >
                <CalendarIcon className="h-4 w-4 mr-1" />
                Calendar
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAIGenerate(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                AI Generate
              </Button>
              <Button onClick={() => setShowNewTask(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* List View Toolbar */}
      {viewMode === "list" && (
        <>
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-background">
            <GroupByDropdown value={groupBy} onChange={setGroupBy} />
            <SortDropdown
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortByChange={setSortBy}
              onSortOrderChange={setSortOrder}
            />
            <FilterPopover
              filters={filters}
              onFiltersChange={setFilters}
              availableStatuses={availableStatuses}
              availablePriorities={availablePriorities}
              availableAssignees={[]}
              availableLabels={[]}
            />
          </div>
          <FilterChips filters={filters} onRemoveFilter={handleRemoveFilter} />
        </>
      )}

      {/* Content */}
      <div className={`flex-1 overflow-auto ${contentPaddingBottom}`}>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : viewMode === "list" ? (
          <div>
            {/* Add task input */}
            {showNewTask && (
              <div className="flex items-center gap-2 px-4 py-3 border-b bg-accent/20">
                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task name..."
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 h-8"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateTask()
                    if (e.key === "Escape") {
                      setShowNewTask(false)
                      setNewTaskTitle("")
                    }
                  }}
                  autoFocus
                />
                <Button size="sm" onClick={handleCreateTask}>
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowNewTask(false)
                    setNewTaskTitle("")
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Task table */}
            {flatTasks.length > 0 ? (
              <div>
                {/* Table Header */}
                <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
                  <div style={{ width: "8px" }} className="flex-shrink-0" /> {/* Indent spacer matching depth-0 rows */}
                  <Checkbox
                    checked={selectedTasks.size === flatTasks.length && flatTasks.length > 0}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    className="flex-shrink-0"
                  />
                  <div className="w-5 flex-shrink-0" /> {/* Expand/collapse button space */}
                  <div className="flex-1 min-w-[200px]">Name</div>
                  <div className="w-28 flex-shrink-0">Status</div>
                  <div className="w-24 flex-shrink-0">Priority</div>
                  <div className="w-24 flex-shrink-0">Due Date</div>
                  <div className="w-24 flex-shrink-0">Assignee</div>
                  <div className="w-24 flex-shrink-0">List</div>
                  <div className="w-24 flex-shrink-0">Tags</div>
                  <div className="w-20 flex-shrink-0">Created</div>
                  <div className="w-20 flex-shrink-0">Updated</div>
                </div>

                {/* Tasks or Groups */}
                {groupBy ? (
                  // Grouped view
                  getSortedGroupKeys(groupedTasks).map((groupKey) => (
                    <div key={groupKey} className="border-b">
                      <GroupHeader
                        title={getGroupName(groupKey)}
                        count={groupedTasks[groupKey].length}
                        isCollapsed={collapsedGroups.has(groupKey)}
                        onToggle={() => toggleGroupCollapse(groupKey)}
                      />
                      {!collapsedGroups.has(groupKey) && (
                        <div>
                          {groupedTasks[groupKey].map((rootTask) => {
                            // Get the root task + its expanded subtasks
                            const taskWithSubtasks = flattenTree([rootTask], expandedTasks)
                            return taskWithSubtasks.map((task) => (
                              <React.Fragment key={task.id}>
                                <TaskTableRowWrapper
                                  task={task}
                                  depth={task.depth}
                                  hasChildren={task.children.length > 0}
                                  childCount={task.children.length}
                                  isExpanded={expandedTasks.has(task.id)}
                                  onToggleExpand={toggleExpand}
                                  isSelected={selectedTasks.has(task.id)}
                                  onSelect={handleTaskSelect}
                                  onStatusChange={handleStatusChange}
                                  onClick={(taskId) => setSelectedTask(taskId)}
                                  workspaceId={workspaceId}
                                  workspaceMembers={workspaceMembers || []}
                                  onPriorityChange={handlePriorityChange}
                                  onDueDateChange={handleDueDateChange}
                                  onAssigneeAdd={handleAssigneeAdd}
                                  onAssigneeRemove={handleAssigneeRemove}
                                  onRename={handleRename}
                                  onAddSubtask={handleAddSubtask}
                                />
                                {addingSubtaskFor === task.id && (
                                  <InlineSubtaskInput
                                    depth={(task.depth || 0) + 1}
                                    onSubmit={(title) => handleCreateSubtask(task.id, title)}
                                    onCancel={() => setAddingSubtaskFor(null)}
                                  />
                                )}
                              </React.Fragment>
                            ))
                          })}
                          {/* Inline new task row */}
                          <InlineNewTaskRow
                            listId={listId}
                            defaultStatus={groupBy === "status" ? groupKey : "todo"}
                            defaultPriority={groupBy === "priority" ? groupKey : undefined}
                            onCreateTask={createTaskMutation.mutate}
                          />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  // Flat view
                  (
                    <>
                      {flatTasks.map((task) => (
                        <React.Fragment key={task.id}>
                          <TaskTableRowWrapper
                            task={task}
                            depth={task.depth}
                            hasChildren={task.children.length > 0}
                            childCount={task.children.length}
                            isExpanded={expandedTasks.has(task.id)}
                            onToggleExpand={toggleExpand}
                            isSelected={selectedTasks.has(task.id)}
                            onSelect={handleTaskSelect}
                            onStatusChange={handleStatusChange}
                            onClick={(taskId) => setSelectedTask(taskId)}
                            workspaceId={workspaceId}
                            workspaceMembers={workspaceMembers || []}
                            onPriorityChange={handlePriorityChange}
                            onDueDateChange={handleDueDateChange}
                            onAssigneeAdd={handleAssigneeAdd}
                            onAssigneeRemove={handleAssigneeRemove}
                            onRename={handleRename}
                            onAddSubtask={handleAddSubtask}
                          />
                          {addingSubtaskFor === task.id && (
                            <InlineSubtaskInput
                              depth={(task.depth || 0) + 1}
                              onSubmit={(title) => handleCreateSubtask(task.id, title)}
                              onCancel={() => setAddingSubtaskFor(null)}
                            />
                          )}
                        </React.Fragment>
                      ))}
                      {/* Inline new task row for flat view */}
                      <InlineNewTaskRow
                        listId={listId}
                        defaultStatus="todo"
                        onCreateTask={createTaskMutation.mutate}
                      />
                    </>
                  )
                )}
              </div>
            ) : tasks && tasks.length > 0 ? (
              // No results after filtering
              <div className="p-12 text-center">
                <List className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tasks match your filters</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your filters or search criteria.
                </p>
                <Button variant="outline" onClick={() => setFilters({
                  status: [],
                  priority: [],
                  assigneeIds: [],
                  dueDateRange: null,
                  labels: [],
                })}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              // No tasks at all
              <div className="p-12 text-center">
                <List className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first task to get started.
                </p>
                <Button onClick={() => setShowNewTask(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            )}
          </div>
        ) : viewMode === "board" ? (
          <div className="h-full">
            {statuses && statuses.length > 0 ? (
              <KanbanBoard
                tasks={tasks || []}
                statuses={statuses}
                listId={listId}
                workspaceId={workspaceId}
              />
            ) : (
              <div className="p-12 text-center">
                <LayoutGrid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No statuses configured</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This list doesn&apos;t have any statuses yet. Create tasks to get started.
                </p>
                <Button onClick={() => setShowNewTask(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            )}
          </div>
        ) : viewMode === "gantt" ? (
          <div className="h-full">
            <TimelineView
              tasks={sortedTasks}
              onTaskUpdate={handleDueDateChange}
              groupBy={null}
              statuses={availableStatuses}
              workspaceMembers={workspaceMembers || []}
            />
          </div>
        ) : viewMode === "calendar" ? (
          <div className="h-full">
            {tasks && tasks.length > 0 ? (
              <CalendarView
                tasks={tasks}
                onTaskClick={(taskId) => setSelectedTask(taskId)}
              />
            ) : (
              <div className="p-12 text-center">
                <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add tasks with due dates to see them on the calendar.
                </p>
                <Button onClick={() => setShowNewTask(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </div>
            )}
          </div>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedTasks.size}
        selectedTasks={selectedTasks}
        onClearSelection={handleClearSelection}
        onStatusChange={handleBulkStatusChange}
        onPriorityChange={handleBulkPriorityChange}
        onAssigneeAdd={() => {}}
        onLabelAdd={() => {}}
        onDelete={handleBulkDelete}
        availableStatuses={availableStatuses}
        availablePriorities={availablePriorities}
        availableAssignees={[]}
        availableLabels={[]}
      />

      {/* AI Generate Modal */}
      <AIGenerateModal
        isOpen={showAIGenerate}
        onClose={() => setShowAIGenerate(false)}
        listId={listId}
        onTasksCreated={(count) => {
          // Optionally show a success message or refresh tasks
          console.log(`Created ${count} tasks`)
        }}
      />

      {/* Task Detail Panel */}
      <TaskDetailPanel
        task={selectedTaskId ? tasks?.find((t) => t.id === selectedTaskId) : null}
        taskId={selectedTaskId || undefined}
        open={isTaskPanelOpen}
        onClose={closeTaskPanel}
        onTaskSelect={setSelectedTask}
        statuses={statuses || []}
        workspaceId={workspaceId}
      />
    </div>
  )
}
