// Documents API Types
export interface DocumentResponse {
  id: string
  workspaceId: string
  spaceId: string | null
  title: string
  content: Record<string, unknown> | null
  icon: string | null
  coverUrl: string | null
  parentDocumentId: string | null
  creatorId: string
  createdAt: string
  updatedAt: string
}

export async function fetchDocuments(workspaceId: string): Promise<DocumentResponse[]> {
  const res = await fetch(`/api/workspaces/${workspaceId}/documents`)
  const data = await res.json()
  return data.documents || []
}

export async function fetchDocument(documentId: string): Promise<{ document: DocumentResponse }> {
  const res = await fetch(`/api/documents/${documentId}`)
  return res.json()
}

export async function createDocument(
  workspaceId: string,
  data: {
    title: string
    spaceId?: string
    parentDocumentId?: string
    icon?: string
  }
): Promise<{ document: DocumentResponse }> {
  const res = await fetch(`/api/workspaces/${workspaceId}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateDocument(
  documentId: string,
  data: Partial<{
    title: string
    content: Record<string, unknown>
    icon: string
    coverUrl: string
    parentDocumentId: string
  }>
): Promise<{ document: DocumentResponse }> {
  const res = await fetch(`/api/documents/${documentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function deleteDocument(documentId: string): Promise<void> {
  await fetch(`/api/documents/${documentId}`, {
    method: "DELETE",
  })
}
