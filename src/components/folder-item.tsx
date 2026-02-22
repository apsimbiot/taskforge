"use client"

import { ChevronRight, FolderClosed, MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSidebarStore } from "@/store"
import { Folder as FolderType } from "@/store"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export interface FolderItemProps {
  folder: FolderType
  spaceId: string
  workspaceId: string
  onDelete?: (id: string) => void
  className?: string
}

export function FolderItem({ folder, spaceId, workspaceId, onDelete, className }: FolderItemProps) {
  const router = useRouter()
  const { isFolderExpanded, toggleFolder } = useSidebarStore()
  const expanded = isFolderExpanded(folder.id)

  const handleClick = () => {
    router.push(`/dashboard/workspaces/${workspaceId}/spaces/${spaceId}/folders/${folder.id}`)
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
            toggleFolder(folder.id)
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
        
        <FolderClosed className="h-4 w-4 text-muted-foreground" />
        
        <span className="text-sm truncate flex-1">{folder.name}</span>
        
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
            <DropdownMenuItem onClick={() => onDelete?.(folder.id)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
