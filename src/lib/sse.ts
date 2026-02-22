/**
 * Server-Sent Events (SSE) event broadcasting system.
 * 
 * This module manages SSE connections per workspace and provides
 * a function to broadcast events to all connected clients.
 */

type SSEController = ReadableStreamDefaultController;

// Store active connections per workspace
const workspaceConnections = new Map<string, Set<SSEController>>();

/**
 * Register a new SSE connection for a workspace
 */
export function addConnection(workspaceId: string, controller: SSEController) {
  if (!workspaceConnections.has(workspaceId)) {
    workspaceConnections.set(workspaceId, new Set());
  }
  workspaceConnections.get(workspaceId)!.add(controller);
}

/**
 * Remove an SSE connection for a workspace
 */
export function removeConnection(workspaceId: string, controller: SSEController) {
  const connections = workspaceConnections.get(workspaceId);
  if (connections) {
    connections.delete(controller);
    if (connections.size === 0) {
      workspaceConnections.delete(workspaceId);
    }
  }
}

/**
 * Get the number of active connections for a workspace
 */
export function getConnectionCount(workspaceId: string): number {
  return workspaceConnections.get(workspaceId)?.size ?? 0;
}

export type SSEEventType = 
  | "task_created"
  | "task_updated" 
  | "task_deleted"
  | "comment_added"
  | "sprint_updated"
  | "notification";

export interface SSEEvent {
  type: SSEEventType;
  data: Record<string, unknown>;
}

/**
 * Broadcast an event to all connected clients in a workspace
 */
export function broadcastToWorkspace(workspaceId: string, event: SSEEvent) {
  const connections = workspaceConnections.get(workspaceId);
  if (!connections || connections.size === 0) return;

  const message = `data: ${JSON.stringify(event)}\n\n`;
  const encoded = new TextEncoder().encode(message);

  for (const controller of connections) {
    try {
      controller.enqueue(encoded);
    } catch {
      // Connection closed, remove it
      connections.delete(controller);
    }
  }

  // Clean up empty workspace entries
  if (connections.size === 0) {
    workspaceConnections.delete(workspaceId);
  }
}
