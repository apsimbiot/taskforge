import { create } from 'zustand'

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface DraggedTask {
  id: string
  title: string
  listId: string
}

export interface TaskDragState {
  isDragging: boolean
  draggedTask: DraggedTask | null
  dropTargetListId: string | null
  
  startDrag: (task: DraggedTask) => void
  endDrag: () => void
  setDropTarget: (listId: string | null) => void
}

export const useTaskStore = create<TaskDragState>((set) => ({
  isDragging: false,
  draggedTask: null,
  dropTargetListId: null,
  
  startDrag: (task) => set({ 
    isDragging: true, 
    draggedTask: task 
  }),
  
  endDrag: () => set({ 
    isDragging: false, 
    draggedTask: null,
    dropTargetListId: null 
  }),
  
  setDropTarget: (listId) => set({ dropTargetListId: listId }),
}))
