"use client"

import { use, useState, useCallback, useMemo } from "react"
import {
  Plus,
  List,
  LayoutGrid,
  GanttChart,
  ChevronDown,
  ChevronRight,
  Check,
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
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useStatuses, useWorkspaceMembers, useAddTaskAssignee, useRemoveTaskAssignee } from "@/hooks/useQueries"
import { cn } from "@/lib/utils"
import type { TaskResponse } from "@/lib/api"

// Import new list view components
import { GroupByDropdown } from "@/components/list-view/group-by-dropdown"
import { SortDropdown, PRIORITY_ORDER } from "@/components/list-view/sort-dropdown"
import { FilterPopover, type FilterState } from "@/components/list-view/filter-popover"
import { TaskTableRowWrapper } from "@/components/list-view/task-table-row-wrapper"
import { BulkActionsBar } from "@/components/list-view/bulk-actions-bar"

type ViewMode = "list" | "board" | "gantt"
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

export default function ListPage({
  params,
}: {
  params: Promise<{ id: string; spaceId: string; listId: string }>
}) {
  const { id: workspaceId, spaceId, listId } = use(params)
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
  const { selectedTaskId, setSelectedTask, isOpen: isTaskPanelOpen, close: closeTaskPanel } = useTaskPanel()

  // Available filter options (from API or defaults)
  const availableStatuses = statuses && statuses.length > 0
    ? statuses.map((s) => ({ value: s.id, label: s.name, color: s.color || "#6b7280" }))
    : DEFAULT_STATUSES
  const availablePriorities = DEFAULT_PRIORITIES

  // Filter and sort tasks
  const processedTasks = useMemo(() => {
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

    // Apply sorting
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
  }, [tasks, filters, sortBy, sortOrder])

  // Group tasks if grouping is enabled
  const groupedTasks = useMemo(() => {
    if (!groupBy) return { ungrouped: processedTasks }

    const groups: Record<string, TaskResponse[]> = {}

    processedTasks.forEach((task) => {
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
  }, [processedTasks, groupBy])

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
    (taskId: string, date: string | null) => {
      updateTaskMutation.mutate({ taskId, dueDate: date || undefined })
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
        setSelectedTasks(new Set(processedTasks.map((t) => t.id)))
      } else {
        setSelectedTasks(new Set())
      }
    },
    [processedTasks]
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
            <h1 className="text-2xl font-bold">List</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {processedTasks.length} task{processedTasks.length !== 1 ? "s" : ""}
              {processedTasks.length !== (tasks?.length || 0) && (
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
            </div>
            <Button onClick={() => setShowNewTask(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
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
            {processedTasks.length > 0 ? (
              <div>
                {/* Table Header */}
                <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
                  <Checkbox
                    checked={selectedTasks.size === processedTasks.length && processedTasks.length > 0}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    className="flex-shrink-0"
                  />
                  <div className="w-4 flex-shrink-0" /> {/* Status button space */}
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
                          {groupedTasks[groupKey].map((task) => (
                            <TaskTableRowWrapper
                              key={task.id}
                              task={task}
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
                            />
                          ))}
                          {/* Inline new task row */}
                          <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 hover:bg-accent/20">
                            <Plus className="h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="+ New task..."
                              className="border-0 bg-transparent focus-visible:ring-0 text-sm h-7"
                              value={groupBy === "status" ? newTaskTitle : ""}
                              onChange={(e) => {
                                if (groupBy === "status") {
                                  setNewTaskTitle(e.target.value)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && newTaskTitle.trim()) {
                                  createTaskMutation.mutate({
                                    listId,
                                    title: newTaskTitle.trim(),
                                    status: groupKey,
                                  })
                                  setNewTaskTitle("")
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  // Flat view
                  (
                    <>
                      {processedTasks.map((task) => (
                        <TaskTableRowWrapper
                          key={task.id}
                          task={task}
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
                        />
                      ))}
                      {/* Inline new task row for flat view */}
                      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 hover:bg-accent/20">
                        <Plus className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="+ New task..."
                          className="border-0 bg-transparent focus-visible:ring-0 text-sm h-7"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newTaskTitle.trim()) {
                              createTaskMutation.mutate({
                                listId,
                                title: newTaskTitle.trim(),
                                status: "todo",
                              })
                              setNewTaskTitle("")
                            }
                          }}
                        />
                      </div>
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
        ) : (
          // Gantt view placeholder
          <div className="p-12 text-center">
            <GanttChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Gantt View</h3>
            <p className="text-sm text-muted-foreground">
              Coming soon — timeline visualization for your tasks.
            </p>
          </div>
        )}
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

      {/* Task Detail Panel */}
      <TaskDetailPanel
        task={selectedTaskId ? tasks?.find((t) => t.id === selectedTaskId) : null}
        open={isTaskPanelOpen}
        onClose={closeTaskPanel}
        statuses={statuses || []}
        workspaceId={workspaceId}
      />
    </div>
  )
}
