"use client"

import { ChevronRight, Folder, MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSidebarStore } from "@/store"
import { Space } from "@/store"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export interface SpaceItemProps {
  space: Space
  workspaceId: string
  onDelete?: (id: string) => void
  className?: string
}

export function SpaceItem({ space, workspaceId, onDelete, className }: SpaceItemProps) {
  const router = useRouter()
  const { isSpaceExpanded, toggleSpace } = useSidebarStore()
  const expanded = isSpaceExpanded(space.id)

  const handleClick = () => {
    router.push(`/dashboard/workspaces/${workspaceId}/spaces/${space.id}`)
  }

  return (
    <div className={cn("group", className)}>
      <div
        className="flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={handleClick}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleSpace(space.id)
          }}
          className="p-0.5 hover:bg-accent rounded transition-colors"
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              expanded && "rotate-90"
            )}
          />
        </button>
        
        <div
          className="w-3 h-3 rounded-sm flex-shrink-0"
          style={{ backgroundColor: space.color }}
        />
        
        <span className="text-sm truncate flex-1">{space.name}</span>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onDelete?.(space.id)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
