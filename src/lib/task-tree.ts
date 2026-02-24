import { TaskResponse } from "./api"

export interface TaskTreeNode extends TaskResponse {
  children: TaskTreeNode[]
  depth: number
}

export function buildTaskTree(tasks: TaskResponse[], maxDepth: number = 3): TaskTreeNode[] {
  const taskMap = new Map<string, TaskTreeNode>()
  const roots: TaskTreeNode[] = []

  // Create nodes
  for (const task of tasks) {
    taskMap.set(task.id, { ...task, children: [], depth: 0 })
  }

  // First pass: link children to parents (depth stays 0 for now)
  for (const task of tasks) {
    const node = taskMap.get(task.id)!
    if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
      const parent = taskMap.get(task.parentTaskId)!
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // Second pass: calculate depths recursively from roots
  function setDepths(nodes: TaskTreeNode[], depth: number) {
    for (const node of nodes) {
      node.depth = depth
      if (depth < maxDepth) {
        setDepths(node.children, depth + 1)
      } else {
        // Beyond max depth — remove children so they don't render
        node.children = []
      }
    }
  }
  setDepths(roots, 0)

  return roots
}

export function flattenTree(nodes: TaskTreeNode[], expandedIds: Set<string>): TaskTreeNode[] {
  const result: TaskTreeNode[] = []
  for (const node of nodes) {
    result.push(node)
    if (node.children.length > 0 && expandedIds.has(node.id)) {
      result.push(...flattenTree(node.children, expandedIds))
    }
  }
  return result
}

// Get only root tasks (for grouping purposes)
export function getRootTasks(nodes: TaskTreeNode[]): TaskTreeNode[] {
  return nodes.filter(node => node.depth === 0)
}

// Get subtasks for a given parent task
export function getSubtasks(node: TaskTreeNode, expandedIds: Set<string>): TaskTreeNode[] {
  if (node.children.length === 0 || !expandedIds.has(node.id)) {
    return []
  }
  return flattenTree(node.children, expandedIds)
}
