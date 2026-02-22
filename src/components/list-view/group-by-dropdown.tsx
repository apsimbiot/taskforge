"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronDown, Layers } from "lucide-react"

type GroupByOption = "status" | "priority" | "assignee" | "dueDate" | "label" | null

interface GroupByDropdownProps {
  value: GroupByOption
  onChange: (value: GroupByOption) => void
}

const GROUP_BY_OPTIONS: { value: GroupByOption; label: string }[] = [
  { value: null, label: "None" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "assignee", label: "Assignee" },
  { value: "dueDate", label: "Due Date" },
  { value: "label", label: "Label" },
]

export function GroupByDropdown({ value, onChange }: GroupByDropdownProps) {
  const currentLabel = GROUP_BY_OPTIONS.find((opt) => opt.value === value)?.label || "None"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1">
          <Layers className="h-4 w-4" />
          <span>Group by: {currentLabel}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {GROUP_BY_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value ?? "none"}
            onClick={() => onChange(option.value)}
            className={value === option.value ? "bg-accent" : ""}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
