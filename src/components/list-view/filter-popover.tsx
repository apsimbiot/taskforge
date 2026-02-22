"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronDown, Filter, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FilterState {
  status: string[]
  priority: string[]
  assigneeIds: string[]
  dueDateRange: { start: string; end: string } | null
  labels: string[]
}

interface FilterPopoverProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  availableStatuses: { value: string; label: string; color: string }[]
  availablePriorities: { value: string; label: string }[]
  availableAssignees: { value: string; label: string; avatar?: string }[]
  availableLabels: { value: string; label: string; color: string }[]
}

const DEFAULT_FILTERS: FilterState = {
  status: [],
  priority: [],
  assigneeIds: [],
  dueDateRange: null,
  labels: [],
}

export function FilterPopover({
  filters,
  onFiltersChange,
  availableStatuses,
  availablePriorities,
  availableAssignees,
  availableLabels,
}: FilterPopoverProps) {
  const [open, setOpen] = React.useState(false)

  const activeFilterCount = React.useMemo(() => {
    let count = 0
    if (filters.status.length) count += filters.status.length
    if (filters.priority.length) count += filters.priority.length
    if (filters.assigneeIds.length) count += filters.assigneeIds.length
    if (filters.dueDateRange) count += 1
    if (filters.labels.length) count += filters.labels.length
    return count
  }, [filters])

  const toggleStatus = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status]
    onFiltersChange({ ...filters, status: newStatus })
  }

  const togglePriority = (priority: string) => {
    const newPriority = filters.priority.includes(priority)
      ? filters.priority.filter((p) => p !== priority)
      : [...filters.priority, priority]
    onFiltersChange({ ...filters, priority: newPriority })
  }

  const toggleAssignee = (assigneeId: string) => {
    const newAssignees = filters.assigneeIds.includes(assigneeId)
      ? filters.assigneeIds.filter((a) => a !== assigneeId)
      : [...filters.assigneeIds, assigneeId]
    onFiltersChange({ ...filters, assigneeIds: newAssignees })
  }

  const toggleLabel = (label: string) => {
    const newLabels = filters.labels.includes(label)
      ? filters.labels.filter((l) => l !== label)
      : [...filters.labels, label]
    onFiltersChange({ ...filters, labels: newLabels })
  }

  const setDueDateRange = (range: { start: string; end: string } | null) => {
    onFiltersChange({ ...filters, dueDateRange: range })
  }

  const clearFilters = () => {
    onFiltersChange(DEFAULT_FILTERS)
  }

  const hasFilters = activeFilterCount > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-8 gap-1", hasFilters && "bg-accent")}
        >
          <Filter className="h-4 w-4" />
          <span>Filter</span>
          {hasFilters && (
            <span className="ml-1 rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-0.5 min-w-[1.25rem] text-center">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="bottom">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="font-semibold text-sm">Filters</span>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearFilters}
            >
              Clear all
            </Button>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto p-3 space-y-4">
          {/* Status Filter */}
          {availableStatuses.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <div className="space-y-1">
                {availableStatuses.map((status) => (
                  <label
                    key={status.value}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded px-2 py-1"
                  >
                    <Checkbox
                      checked={filters.status.includes(status.value)}
                      onCheckedChange={() => toggleStatus(status.value)}
                    />
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: status.color }}
                    />
                    {status.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Priority Filter */}
          {availablePriorities.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Priority</label>
              <div className="space-y-1">
                {availablePriorities.map((priority) => (
                  <label
                    key={priority.value}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded px-2 py-1"
                  >
                    <Checkbox
                      checked={filters.priority.includes(priority.value)}
                      onCheckedChange={() => togglePriority(priority.value)}
                    />
                    {priority.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Assignee Filter */}
          {availableAssignees.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Assignee</label>
              <div className="space-y-1">
                {availableAssignees.map((assignee) => (
                  <label
                    key={assignee.value}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded px-2 py-1"
                  >
                    <Checkbox
                      checked={filters.assigneeIds.includes(assignee.value)}
                      onCheckedChange={() => toggleAssignee(assignee.value)}
                    />
                    <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs">
                      {assignee.avatar || assignee.label.charAt(0).toUpperCase()}
                    </span>
                    {assignee.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Due Date Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Due Date</label>
            <div className="flex gap-2">
              <input
                type="date"
                className="flex-1 text-sm border rounded px-2 py-1"
                value={filters.dueDateRange?.start || ""}
                onChange={(e) =>
                  setDueDateRange({
                    start: e.target.value,
                    end: filters.dueDateRange?.end || "",
                  })
                }
              />
              <span className="text-muted-foreground">-</span>
              <input
                type="date"
                className="flex-1 text-sm border rounded px-2 py-1"
                value={filters.dueDateRange?.end || ""}
                onChange={(e) =>
                  setDueDateRange({
                    start: filters.dueDateRange?.start || "",
                    end: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* Labels Filter */}
          {availableLabels.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Labels</label>
              <div className="space-y-1">
                {availableLabels.map((label) => (
                  <label
                    key={label.value}
                    className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent rounded px-2 py-1"
                  >
                    <Checkbox
                      checked={filters.labels.includes(label.value)}
                      onCheckedChange={() => toggleLabel(label.value)}
                    />
                    <span
                      className="px-2 py-0.5 rounded text-xs"
                      style={{ backgroundColor: label.color, color: "white" }}
                    >
                      {label.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

