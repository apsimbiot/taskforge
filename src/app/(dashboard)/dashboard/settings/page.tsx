"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { User, Lock, Building2, Loader2, LogOut } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useWorkspaces, useUpdateUser, useUpdateUserPassword, useUpdateWorkspace } from "@/hooks/useSettings"
import { toast } from "sonner"

export default function SettingsPage() {
  const router = useRouter()
  const { data: session, update: updateSession } = useSession()
  
  // Profile state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  // Workspace state
  const [workspaceName, setWorkspaceName] = useState("")
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)

  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces()
  const updateUserMutation = useUpdateUser()
  const updatePasswordMutation = useUpdateUserPassword()
  const updateWorkspaceMutation = useUpdateWorkspace()

  // Initialize user data from session
  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "")
      setEmail(session.user.email || "")
      setAvatarUrl(session.user.image || "")
    }
  }, [session])

  // Initialize workspace data
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0].id)
      setWorkspaceName(workspaces[0].name)
    }
  }, [workspaces, selectedWorkspaceId])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await updateUserMutation.mutateAsync({
        name,
        avatarUrl: avatarUrl || undefined,
      })
      
      // Update session with new data
      await updateSession({
        ...session,
        user: {
          ...session?.user,
          name,
          image: avatarUrl,
        },
      })
      
      toast.success("Profile updated successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile")
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    
    try {
      await updatePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      })
      
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      
      toast.success("Password changed successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to change password")
    }
  }

  const handleWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedWorkspaceId) return
    
    try {
      await updateWorkspaceMutation.mutateAsync({
        workspaceId: selectedWorkspaceId,
        name: workspaceName,
      })
      
      toast.success("Workspace updated successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update workspace")
    }
  }

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/login" })
  }

  const isAdmin = true // TODO: Check actual role

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and workspace settings</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <Lock className="h-4 w-4" />
            Account
          </TabsTrigger>
          <TabsTrigger value="workspace" className="gap-2">
            <Building2 className="h-4 w-4" />
            Workspace
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and avatar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarUrl} alt={name} />
                    <AvatarFallback className="text-xl">
                      {name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Label htmlFor="avatarUrl">Avatar URL</Label>
                    <Input
                      id="avatarUrl"
                      type="url"
                      placeholder="https://example.com/avatar.jpg"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="max-w-md"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a URL to an image, or leave empty for default
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateUserMutation.isPending}>
                    {updateUserMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={updatePasswordMutation.isPending}>
                    {updatePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Changing...
                      </>
                    ) : (
                      "Change Password"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Permanently delete your account and all associated data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm text-muted-foreground">
                    Once you delete your account, there is no going back
                  </p>
                </div>
                <Button variant="destructive" disabled>
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workspace Tab */}
        <TabsContent value="workspace">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Settings</CardTitle>
              <CardDescription>
                Manage your workspace name and members
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workspacesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : workspaces && workspaces.length > 0 ? (
                <form onSubmit={handleWorkspaceSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="workspaceName">Workspace Name</Label>
                    <Input
                      id="workspaceName"
                      type="text"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={updateWorkspaceMutation.isPending}>
                      {updateWorkspaceMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-muted-foreground">No workspace found</p>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Workspace Members</CardTitle>
              <CardDescription>
                People who have access to this workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Member management coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Logout Button */}
      <div className="mt-8 pt-6 border-t">
        <Button 
          variant="outline" 
          className="text-destructive border-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
