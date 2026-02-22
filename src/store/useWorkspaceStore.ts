import { create } from 'zustand'

export interface Workspace {
  id: string
  name: string
  color: string
  icon?: string
  createdAt: Date
}

export interface Space {
  id: string
  workspaceId: string
  name: string
  color: string
  icon?: string
  createdAt: Date
}

export interface Folder {
  id: string
  spaceId: string
  name: string
  createdAt: Date
}

export interface TaskList {
  id: string
  folderId: string
  name: string
  color?: string
  taskCount?: number
  createdAt: Date
}

export interface Task {
  id: string
  listId: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: Date
  estimatedTime?: number
  actualTime?: number
  createdAt: Date
  updatedAt: Date
}

interface WorkspaceState {
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  spaces: Space[]
  folders: Folder[]
  lists: TaskList[]
  tasks: Task[]
  isLoading: boolean
  error: string | null
  
  setCurrentWorkspace: (workspace: Workspace | null) => void
  setWorkspaces: (workspaces: Workspace[]) => void
  addWorkspace: (workspace: Workspace) => void
  updateWorkspace: (id: string, data: Partial<Workspace>) => void
  deleteWorkspace: (id: string) => void
  
  setSpaces: (spaces: Space[]) => void
  addSpace: (space: Space) => void
  updateSpace: (id: string, data: Partial<Space>) => void
  deleteSpace: (id: string) => void
  
  setFolders: (folders: Folder[]) => void
  addFolder: (folder: Folder) => void
  updateFolder: (id: string, data: Partial<Folder>) => void
  deleteFolder: (id: string) => void
  
  setLists: (lists: TaskList[]) => void
  addList: (list: TaskList) => void
  updateList: (id: string, data: Partial<TaskList>) => void
  deleteList: (id: string) => void
  
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (id: string, data: Partial<Task>) => void
  deleteTask: (id: string) => void
  
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspace: null,
  workspaces: [],
  spaces: [],
  folders: [],
  lists: [],
  tasks: [],
  isLoading: false,
  error: null,
  
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  setWorkspaces: (workspaces) => set({ workspaces }),
  addWorkspace: (workspace) => set((state) => ({ 
    workspaces: [...state.workspaces, workspace] 
  })),
  updateWorkspace: (id, data) => set((state) => ({
    workspaces: state.workspaces.map((w) => 
      w.id === id ? { ...w, ...data } : w
    ),
    currentWorkspace: state.currentWorkspace?.id === id 
      ? { ...state.currentWorkspace, ...data }
      : state.currentWorkspace
  })),
  deleteWorkspace: (id) => set((state) => ({
    workspaces: state.workspaces.filter((w) => w.id !== id),
    currentWorkspace: state.currentWorkspace?.id === id ? null : state.currentWorkspace
  })),
  
  setSpaces: (spaces) => set({ spaces }),
  addSpace: (space) => set((state) => ({ 
    spaces: [...state.spaces, space] 
  })),
  updateSpace: (id, data) => set((state) => ({
    spaces: state.spaces.map((s) => 
      s.id === id ? { ...s, ...data } : s
    )
  })),
  deleteSpace: (id) => set((state) => ({
    spaces: state.spaces.filter((s) => s.id !== id)
  })),
  
  setFolders: (folders) => set({ folders }),
  addFolder: (folder) => set((state) => ({ 
    folders: [...state.folders, folder] 
  })),
  updateFolder: (id, data) => set((state) => ({
    folders: state.folders.map((f) => 
      f.id === id ? { ...f, ...data } : f
    )
  })),
  deleteFolder: (id) => set((state) => ({
    folders: state.folders.filter((f) => f.id !== id)
  })),
  
  setLists: (lists) => set({ lists }),
  addList: (list) => set((state) => ({ 
    lists: [...state.lists, list] 
  })),
  updateList: (id, data) => set((state) => ({
    lists: state.lists.map((l) => 
      l.id === id ? { ...l, ...data } : l
    )
  })),
  deleteList: (id) => set((state) => ({
    lists: state.lists.filter((l) => l.id !== id)
  })),
  
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ 
    tasks: [...state.tasks, task] 
  })),
  updateTask: (id, data) => set((state) => ({
    tasks: state.tasks.map((t) => 
      t.id === id ? { ...t, ...data } : t
    )
  })),
  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id)
  })),
  
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}))
