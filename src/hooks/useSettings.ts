import { useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchWorkspaces, updateWorkspace, type WorkspaceResponse } from "@/lib/api"

export { fetchWorkspaces }

// ── User Hooks ─────────────────────────────────────────────────────────────

export function useUpdateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { name: string; avatarUrl?: string }) => {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to update profile" }))
        throw new Error(error.error || "Failed to update profile")
      }
      
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] })
    },
  })
}

export function useUpdateUserPassword() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to change password" }))
        throw new Error(error.error || "Failed to change password")
      }
      
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] })
    },
  })
}

// ── Workspace Hooks ─────────────────────────────────────────────────────────

export function useUpdateWorkspace() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ workspaceId, name }: { workspaceId: string; name: string }) => {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to update workspace" }))
        throw new Error(error.error || "Failed to update workspace")
      }
      
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] })
    },
  })
}
