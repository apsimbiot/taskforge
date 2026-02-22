"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

type SortByOption = "dueDate" | "priority" | "name" | "createdAt" | "updatedAt"
type SortOrder = "asc" | "desc"

interface SortDropdownProps {
  sortBy: SortByOption
  sortOrder: SortOrder
  onSortByChange: (value: SortByOption) => void
  onSortOrderChange: (value: SortOrder) => void
}

const SORT_OPTIONS: { value: SortByOption; label: string }[] = [
  { value: "dueDate", label: "Due Date" },
  { value: "priority", label: "Priority" },
  { value: "name", label: "Name" },
  { value: "createdAt", label: "Date Created" },
  { value: "updatedAt", label: "Date Updated" },
]

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
}

export function SortDropdown({
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
}: SortDropdownProps) {
  const currentLabel = SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label || "Due Date"

  const handleSortClick = (value: SortByOption) => {
    if (value === sortBy) {
      // Toggle order if same field
      onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")
    } else {
      onSortByChange(value)
      onSortOrderChange("asc")
    }
  }

  const getSortIcon = (optionValue: SortByOption) => {
    if (optionValue !== sortBy) return null
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-auto" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-auto" />
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1">
          <ArrowUpDown className="h-4 w-4" />
          <span>Sort by: {currentLabel}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {SORT_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSortClick(option.value)}
            className={sortBy === option.value ? "bg-accent" : ""}
          >
            {option.label}
            {getSortIcon(option.value)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { PRIORITY_ORDER }
export type { SortByOption, SortOrder }
