import { create } from 'zustand'

interface TaskPanelState {
  isOpen: boolean
  selectedTaskId: string | null
  open: (taskId: string) => void
  close: () => void
  setSelectedTask: (taskId: string | null) => void
}

export const useTaskPanel = create<TaskPanelState>((set) => ({
  isOpen: false,
  selectedTaskId: null,
  
  open: (taskId) => set({ isOpen: true, selectedTaskId: taskId }),
  close: () => set({ isOpen: false, selectedTaskId: null }),
  setSelectedTask: (taskId) => set({ 
    selectedTaskId: taskId,
    isOpen: taskId ? true : false 
  }),
}))
