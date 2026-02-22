"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  Search,
  Home,
  PanelLeftClose,
  PanelLeft,
  FolderClosed,
  ListTodo,
  Zap,
  FileText,
  Users,
  BarChart3,
  ClipboardList,
  Bot,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import { CreateWorkspaceDialog } from "@/components/create-workspace-dialog"
import { CreateSpaceDialog } from "@/components/create-space-dialog"
import { CreateFolderDialog } from "@/components/create-folder-dialog"
import { CreateListDialog } from "@/components/create-list-dialog"
import { SearchCommand } from "@/components/search-command"
import { useSidebarStore } from "@/store"
import { useWorkspaces, useSpaces, useFolders, useFolderLists, useCreateWorkspace, useCreateSpace, useCreateFolder, useCreateList } from "@/hooks/useQueries"
import { cn } from "@/lib/utils"
import type { SpaceResponse, FolderResponse, ListResponse } from "@/lib/api"

// ── Sub-components ──────────────────────────────────────────────────────────

function SidebarListItem({
  list,
  workspaceId,
  spaceId,
}: {
  list: ListResponse
  workspaceId: string
  spaceId: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const isActive = pathname?.includes(`/lists/${list.id}`)

  return (
    <button
      onClick={() =>
        router.push(
          `/dashboard/workspaces/${workspaceId}/spaces/${spaceId}/lists/${list.id}`
        )
      }
      className={cn(
        "flex items-center gap-2 w-full px-2 py-1 rounded-md text-sm transition-colors hover:bg-accent/50 text-left",
        isActive && "bg-accent text-accent-foreground"
      )}
    >
      <ListTodo className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <span className="truncate">{list.name}</span>
    </button>
  )
}

function SidebarFolderItem({
  folder,
  workspaceId,
  spaceId,
}: {
  folder: FolderResponse
  workspaceId: string
  spaceId: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isFolderExpanded, toggleFolder } = useSidebarStore()
  const expanded = isFolderExpanded(folder.id)
  const { data: lists } = useFolderLists(expanded ? folder.id : undefined)
  const isActive = pathname?.includes(`/folders/${folder.id}`)

  const [showCreateList, setShowCreateList] = useState(false)
  const createListMutation = useCreateList()

  return (
    <>
      <Collapsible open={expanded} onOpenChange={() => toggleFolder(folder.id)}>
        <div className="group flex items-center">
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-1 flex-1 px-2 py-1 rounded-md text-sm transition-colors hover:bg-accent/50",
                isActive && "bg-accent text-accent-foreground"
              )}
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                  expanded && "rotate-90"
                )}
              />
              <FolderClosed className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate">{folder.name}</span>
            </button>
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setShowCreateList(true)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <CollapsibleContent>
          <div className="ml-6 mt-0.5 space-y-0.5">
            {lists?.map((list) => (
              <SidebarListItem
                key={list.id}
                list={list}
                workspaceId={workspaceId}
                spaceId={spaceId}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
      <CreateListDialog
        open={showCreateList}
        onOpenChange={setShowCreateList}
        folderId={folder.id}
        onSubmit={(data) => {
          createListMutation.mutate({
            folderId: folder.id,
            name: data.name,
            spaceId: spaceId,
          })
        }}
      />
    </>
  )
}

function SidebarSpaceItem({
  space,
  workspaceId,
}: {
  space: SpaceResponse
  workspaceId: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { isSpaceExpanded, toggleSpace } = useSidebarStore()
  const expanded = isSpaceExpanded(space.id)
  const { data: folders } = useFolders(expanded ? space.id : undefined)
  const isActive = pathname?.includes(`/spaces/${space.id}`)

  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const createFolderMutation = useCreateFolder()

  return (
    <>
      <Collapsible open={expanded} onOpenChange={() => toggleSpace(space.id)}>
        <div className="group flex items-center">
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2 flex-1 px-2 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-accent/50",
                isActive && "bg-accent text-accent-foreground"
              )}
            >
              <ChevronRight
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  expanded && "rotate-90"
                )}
              />
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: space.color || "#6366f1" }}
              />
              <span className="truncate">{space.name}</span>
            </button>
          </CollapsibleTrigger>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setShowCreateFolder(true)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <CollapsibleContent>
          <div className="ml-4 mt-0.5 space-y-0.5">
            {folders?.map((folder) => (
              <SidebarFolderItem
                key={folder.id}
                folder={folder}
                workspaceId={workspaceId}
                spaceId={space.id}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
      <CreateFolderDialog
        open={showCreateFolder}
        onOpenChange={setShowCreateFolder}
        spaceId={space.id}
        onSubmit={(data) => {
          createFolderMutation.mutate({
            spaceId: space.id,
            name: data.name,
          })
        }}
      />
    </>
  )
}

// ── Main Sidebar ────────────────────────────────────────────────────────────

export function Sidebar() {
  const router = useRouter()
  const { isCollapsed, toggleCollapse } = useSidebarStore()

  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false)
  const [showCreateSpace, setShowCreateSpace] = useState(false)

  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces()
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)

  // Pick the first workspace by default
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0].id)
    }
  }, [workspaces, selectedWorkspaceId])

  const { data: spaces } = useSpaces(selectedWorkspaceId ?? undefined)

  const createWorkspaceMutation = useCreateWorkspace()
  const createSpaceMutation = useCreateSpace()

  const selectedWorkspace = workspaces?.find((w) => w.id === selectedWorkspaceId)

  if (isCollapsed) {
    return (
      <TooltipProvider>
        <div className="flex flex-col items-center w-14 h-full border-r bg-sidebar py-2 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapse}
                className="h-8 w-8"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>

          <Separator className="w-8" />

          {selectedWorkspace && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 rounded-md cursor-pointer">
                  <AvatarFallback className="rounded-md text-xs font-bold bg-primary/20">
                    {selectedWorkspace.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="right">{selectedWorkspace.name}</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => router.push("/dashboard")}
              >
                <Home className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Dashboard</TooltipContent>
          </Tooltip>

          {selectedWorkspaceId && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => router.push(`/dashboard/workspaces/${selectedWorkspaceId}/sprints`)}
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sprints</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => router.push(`/dashboard/workspaces/${selectedWorkspaceId}/docs`)}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Docs</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => router.push(`/dashboard/workspaces/${selectedWorkspaceId}/automations`)}
                  >
                    <Bot className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Automations</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => router.push(`/dashboard/workspaces/${selectedWorkspaceId}/workload`)}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Workload</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => router.push(`/dashboard/workspaces/${selectedWorkspaceId}/reports`)}
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Reports</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => router.push(`/dashboard/workspaces/${selectedWorkspaceId}/forms`)}
                  >
                    <ClipboardList className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Forms</TooltipContent>
              </Tooltip>
            </>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Search</TooltipContent>
          </Tooltip>

          <div className="mt-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => router.push("/dashboard/settings")}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
    )
  }

  return (
    <>
      <div className="flex flex-col w-64 h-full border-r bg-sidebar">
        {/* Header: Workspace Switcher */}
        <div className="flex items-center border-b px-2 py-1">
          <div className="flex-1 overflow-hidden">
            <WorkspaceSwitcher
              onCreateNew={() => setShowCreateWorkspace(true)}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            className="h-8 w-8 flex-shrink-0"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick actions */}
        <div className="flex flex-col gap-0.5 px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-8"
            onClick={() => router.push("/dashboard")}
          >
            <Home className="h-4 w-4" />
            <span className="text-sm">Home</span>
          </Button>
          <SearchCommand />
          {selectedWorkspaceId && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-8"
                onClick={() => router.push(`/dashboard/workspaces/${selectedWorkspaceId}/sprints`)}
              >
                <Zap className="h-4 w-4" />
                <span className="text-sm">Sprints</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-8"
                onClick={() => router.push(`/dashboard/workspaces/${selectedWorkspaceId}/docs`)}
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm">Docs</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-8"
                onClick={() => router.push(`/dashboard/workspaces/${selectedWorkspaceId}/automations`)}
              >
                <Bot className="h-4 w-4" />
                <span className="text-sm">Automations</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-8"
                onClick={() => router.push(`/dashboard/workspaces/${selectedWorkspaceId}/workload`)}
              >
                <Users className="h-4 w-4" />
                <span className="text-sm">Workload</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-8"
                onClick={() => router.push(`/dashboard/workspaces/${selectedWorkspaceId}/reports`)}
              >
                <BarChart3 className="h-4 w-4" />
                <span className="text-sm">Reports</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 h-8"
                onClick={() => router.push(`/dashboard/workspaces/${selectedWorkspaceId}/forms`)}
              >
                <ClipboardList className="h-4 w-4" />
                <span className="text-sm">Forms</span>
              </Button>
            </>
          )}
        </div>

        <Separator />

        {/* Spaces Tree */}
        <ScrollArea className="flex-1 px-2 py-2">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Spaces
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => setShowCreateSpace(true)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {workspacesLoading ? (
            <div className="space-y-2 px-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-7 bg-muted rounded-md animate-pulse" />
              ))}
            </div>
          ) : spaces && spaces.length > 0 ? (
            <div className="space-y-0.5">
              {spaces.map((space) => (
                <SidebarSpaceItem
                  key={space.id}
                  space={space}
                  workspaceId={selectedWorkspaceId!}
                />
              ))}
            </div>
          ) : (
            <div className="px-2 py-8 text-center">
              <p className="text-sm text-muted-foreground mb-2">No spaces yet</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateSpace(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Space
              </Button>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <Separator />
        <div className="flex items-center gap-2 px-3 py-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1 justify-start gap-2 h-8"
            onClick={() => router.push("/dashboard/settings")}
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm">Settings</span>
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <CreateWorkspaceDialog
        open={showCreateWorkspace}
        onOpenChange={setShowCreateWorkspace}
        onSubmit={(data) => {
          const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
          createWorkspaceMutation.mutate({
            name: data.name,
            slug,
          })
        }}
      />
      {selectedWorkspaceId && (
        <CreateSpaceDialog
          open={showCreateSpace}
          onOpenChange={setShowCreateSpace}
          workspaceId={selectedWorkspaceId}
          onSubmit={(data) => {
            createSpaceMutation.mutate({
              workspaceId: selectedWorkspaceId,
              name: data.name,
              color: data.color,
              icon: data.icon,
            })
          }}
        />
      )}
    </>
  )
}
