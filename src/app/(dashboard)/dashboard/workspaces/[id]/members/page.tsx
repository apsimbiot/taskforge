"use client"

import { use, useState } from "react"
import { useSession } from "next-auth/react"
import { 
  Users, 
  Search, 
  Plus, 
  MoreHorizontal, 
  Trash2, 
  Shield,
  Loader2,
  Mail
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog"
import { Breadcrumb } from "@/components/breadcrumb"
import { useWorkspaceMembers, useAddWorkspaceMember, useUpdateWorkspaceMemberRole, useRemoveWorkspaceMember } from "@/hooks/useQueries"
import { toast } from "sonner"
import type { WorkspaceMemberResponse } from "@/lib/api"

type Role = "owner" | "admin" | "member" | "viewer"

const roleColors: Record<Role, string> = {
  owner: "bg-purple-100 text-purple-800 border-purple-200",
  admin: "bg-blue-100 text-blue-800 border-blue-200",
  member: "bg-gray-100 text-gray-800 border-gray-200",
  viewer: "bg-orange-100 text-orange-800 border-orange-200",
}

const roleLabels: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
}

export default function WorkspaceMembersPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: workspaceId } = use(params)
  const { data: session } = useSession()
  
  const [searchQuery, setSearchQuery] = useState("")
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member")
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMemberResponse | null>(null)

  const { data: members, isLoading, refetch } = useWorkspaceMembers(workspaceId)
  const addMemberMutation = useAddWorkspaceMember()
  const updateRoleMutation = useUpdateWorkspaceMemberRole()
  const removeMemberMutation = useRemoveWorkspaceMember()

  // Get current user's role in this workspace
  const currentUserMember = members?.find(m => m.id === session?.user?.id)
  const currentUserRole = currentUserMember?.role as Role | undefined
  const canManageMembers = currentUserRole === "owner" || currentUserRole === "admin"

  // Filter members by search query
  const filteredMembers = members?.filter(member => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      member.name?.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query)
    )
  })

  // Get user's initials for avatar fallback
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address")
      return
    }

    try {
      await addMemberMutation.mutateAsync({
        workspaceId,
        email: inviteEmail.trim(),
        role: inviteRole,
      })
      toast.success("Member invited successfully")
      setIsInviteOpen(false)
      setInviteEmail("")
      setInviteRole("member")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to invite member")
    }
  }

  const handleRoleChange = async (userId: string, newRole: "admin" | "member" | "viewer") => {
    try {
      await updateRoleMutation.mutateAsync({
        workspaceId,
        userId,
        role: newRole,
      })
      toast.success("Role updated successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role")
    }
  }

  const handleRemoveMember = async () => {
    if (!memberToRemove) return

    try {
      await removeMemberMutation.mutateAsync({
        workspaceId,
        userId: memberToRemove.id,
      })
      toast.success("Member removed successfully")
      setMemberToRemove(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove member")
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <Breadcrumb
          items={[{ label: "Workspace" }, { label: "Members" }]}
          className="mb-2"
        />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Members</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage workspace members and their roles
            </p>
          </div>
          {canManageMembers && (
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Member</DialogTitle>
                  <DialogDescription>
                    Add a new member to this workspace by entering their email address.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="colleague@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <Select value={inviteRole} onValueChange={(value: "admin" | "member" | "viewer") => setInviteRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-blue-500" />
                            <span>Admin</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="member">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span>Member</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="viewer">
                          <div className="flex items-center gap-2">
                            <Search className="h-4 w-4 text-orange-500" />
                            <span>Viewer</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleInvite} 
                    disabled={addMemberMutation.isPending || !inviteEmail.trim()}
                  >
                    {addMemberMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Send Invite
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-4 border-b">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Members Table */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredMembers && filteredMembers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {member.name || "Unknown"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.email}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={roleColors[member.role as Role] || roleColors.member}
                    >
                      {roleLabels[member.role as Role] || member.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManageMembers && member.role !== "owner" && member.id !== session?.user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                            Change Role
                          </div>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleRoleChange(member.id, "admin")}
                            disabled={member.role === "admin"}
                          >
                            <Shield className="mr-2 h-4 w-4 text-blue-500" />
                            Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleRoleChange(member.id, "member")}
                            disabled={member.role === "member"}
                          >
                            <Users className="mr-2 h-4 w-4 text-gray-500" />
                            Member
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleRoleChange(member.id, "viewer")}
                            disabled={member.role === "viewer"}
                          >
                            <Search className="mr-2 h-4 w-4 text-orange-500" />
                            Viewer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => setMemberToRemove(member)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {member.role === "owner" && (
                      <span className="text-sm text-muted-foreground">Owner</span>
                    )}
                    {member.id === session?.user?.id && member.role !== "owner" && !canManageMembers && (
                      <span className="text-sm text-muted-foreground">You</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No members found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery 
                ? "Try adjusting your search query"
                : "Invite members to collaborate in this workspace"
              }
            </p>
          </div>
        )}
      </div>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.name || memberToRemove?.email} from this workspace? 
              They will lose access to all workspace resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveMember}
              disabled={removeMemberMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMemberMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
