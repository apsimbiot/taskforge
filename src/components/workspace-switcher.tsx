"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useWorkspaceStore, Workspace } from "@/store"
import { cn } from "@/lib/utils"

export interface WorkspaceSwitcherProps {
  onCreateNew?: () => void
  className?: string
}

export function WorkspaceSwitcher({ onCreateNew, className }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false)
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspaceStore()

  const handleSelect = (workspace: Workspace) => {
    setCurrentWorkspace(workspace)
    setOpen(false)
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "flex items-center gap-2 w-full justify-start px-2 py-6 hover:bg-accent/50",
            className
          )}
        >
          {currentWorkspace ? (
            <>
              <Avatar className="h-8 w-8 rounded-md">
                <AvatarFallback
                  className="rounded-md text-xs font-bold"
                  style={{ backgroundColor: currentWorkspace.color }}
                >
                  {getInitials(currentWorkspace.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start overflow-hidden">
                <span className="text-sm font-semibold truncate max-w-[140px]">
                  {currentWorkspace.name}
                </span>
                <span className="text-[10px] text-muted-foreground">Workspace</span>
              </div>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Select Workspace</span>
          )}
          <ChevronsUpDown className="h-4 w-4 ml-auto text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => handleSelect(workspace)}
            className="flex items-center gap-2 py-2"
          >
            <Avatar className="h-6 w-6 rounded-md">
              <AvatarFallback
                className="rounded-md text-[10px] font-bold"
                style={{ backgroundColor: workspace.color }}
              >
                {getInitials(workspace.name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{workspace.name}</span>
            {currentWorkspace?.id === workspace.id && (
              <Check className="h-4 w-4 ml-auto" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreateNew} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>Create workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
