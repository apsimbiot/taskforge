"use client"

import { ListTodo, MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"
import { TaskList } from "@/store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export interface ListItemProps {
  list: TaskList
  spaceId: string
  folderId: string
  workspaceId: string
  onDelete?: (id: string) => void
  className?: string
}

export function ListItem({ list, spaceId, folderId, workspaceId, onDelete, className }: ListItemProps) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/dashboard/workspaces/${workspaceId}/spaces/${spaceId}/lists/${list.id}`)
  }

  return (
    <div className={cn("group", className)}>
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={handleClick}
      >
        <ListTodo className="h-4 w-4 text-muted-foreground" />
        
        <span className="text-sm truncate flex-1">{list.name}</span>
        
        {list.taskCount !== undefined && list.taskCount > 0 && (
          <Badge variant="secondary" className="h-5 text-xs px-1.5">
            {list.taskCount}
          </Badge>
        )}
        
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
            <DropdownMenuItem onClick={() => onDelete?.(list.id)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
