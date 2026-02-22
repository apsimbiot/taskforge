import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  type AutomationResponse,
} from "@/lib/api/automations"

export function useAutomations(workspaceId: string | undefined) {
  return useQuery<AutomationResponse[]>({
    queryKey: ["automations", workspaceId],
    queryFn: () => fetchAutomations(workspaceId!),
    enabled: !!workspaceId,
  })
}

export function useCreateAutomation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      workspaceId,
      data,
    }: {
      workspaceId: string
      data: {
        name: string
        enabled?: boolean
        triggerType: string
        triggerConfig: Record<string, unknown>
        actionType: string
        actionConfig: Record<string, unknown>
      }
    }) => createAutomation(workspaceId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["automations", variables.workspaceId] })
    },
  })
}

export function useUpdateAutomation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      automationId,
      data,
    }: {
      automationId: string
      data: Partial<{
        name: string
        enabled: boolean
        triggerType: string
        triggerConfig: Record<string, unknown>
        actionType: string
        actionConfig: Record<string, unknown>
      }>
    }) => updateAutomation(automationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] })
    },
  })
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (automationId: string) => deleteAutomation(automationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] })
    },
  })
}
