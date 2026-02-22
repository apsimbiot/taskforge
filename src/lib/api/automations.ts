// Automations API Types
export interface AutomationResponse {
  id: string
  workspaceId: string
  name: string
  enabled: boolean
  triggerType: "status_change" | "task_created" | "due_date" | "assignment"
  triggerConfig: Record<string, unknown>
  actionType: "change_status" | "assign_user" | "add_label" | "notify"
  actionConfig: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export async function fetchAutomations(
  workspaceId: string
): Promise<AutomationResponse[]> {
  const res = await fetch(`/api/workspaces/${workspaceId}/automations`)
  const data = await res.json()
  return data.automations || []
}

export async function createAutomation(
  workspaceId: string,
  data: {
    name: string
    enabled?: boolean
    triggerType: string
    triggerConfig: Record<string, unknown>
    actionType: string
    actionConfig: Record<string, unknown>
  }
): Promise<{ automation: AutomationResponse }> {
  const res = await fetch(`/api/workspaces/${workspaceId}/automations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateAutomation(
  automationId: string,
  data: Partial<{
    name: string
    enabled: boolean
    triggerType: string
    triggerConfig: Record<string, unknown>
    actionType: string
    actionConfig: Record<string, unknown>
  }>
): Promise<{ automation: AutomationResponse }> {
  const res = await fetch(`/api/automations/${automationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function deleteAutomation(automationId: string): Promise<void> {
  await fetch(`/api/automations/${automationId}`, {
    method: "DELETE",
  })
}
