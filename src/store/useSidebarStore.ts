import { create } from 'zustand'

interface SidebarState {
  isCollapsed: boolean
  expandedSpaces: Set<string>
  expandedFolders: Set<string>
  expandedLists: Set<string>
  
  toggleCollapse: () => void
  setCollapsed: (collapsed: boolean) => void
  
  toggleSpace: (spaceId: string) => void
  expandSpace: (spaceId: string) => void
  collapseSpace: (spaceId: string) => void
  isSpaceExpanded: (spaceId: string) => boolean
  
  toggleFolder: (folderId: string) => void
  expandFolder: (folderId: string) => void
  collapseFolder: (folderId: string) => void
  isFolderExpanded: (folderId: string) => boolean
  
  toggleList: (listId: string) => void
  expandList: (listId: string) => void
  collapseList: (listId: string) => void
  isListExpanded: (listId: string) => boolean
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  isCollapsed: false,
  expandedSpaces: new Set<string>(),
  expandedFolders: new Set<string>(),
  expandedLists: new Set<string>(),
  
  toggleCollapse: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
  
  toggleSpace: (spaceId) => set((state) => {
    const newExpanded = new Set(state.expandedSpaces)
    if (newExpanded.has(spaceId)) {
      newExpanded.delete(spaceId)
    } else {
      newExpanded.add(spaceId)
    }
    return { expandedSpaces: newExpanded }
  }),
  
  expandSpace: (spaceId) => set((state) => {
    const newExpanded = new Set(state.expandedSpaces)
    newExpanded.add(spaceId)
    return { expandedSpaces: newExpanded }
  }),
  
  collapseSpace: (spaceId) => set((state) => {
    const newExpanded = new Set(state.expandedSpaces)
    newExpanded.delete(spaceId)
    return { expandedSpaces: newExpanded }
  }),
  
  isSpaceExpanded: (spaceId) => get().expandedSpaces.has(spaceId),
  
  toggleFolder: (folderId) => set((state) => {
    const newExpanded = new Set(state.expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    return { expandedFolders: newExpanded }
  }),
  
  expandFolder: (folderId) => set((state) => {
    const newExpanded = new Set(state.expandedFolders)
    newExpanded.add(folderId)
    return { expandedFolders: newExpanded }
  }),
  
  collapseFolder: (folderId) => set((state) => {
    const newExpanded = new Set(state.expandedFolders)
    newExpanded.delete(folderId)
    return { expandedFolders: newExpanded }
  }),
  
  isFolderExpanded: (folderId) => get().expandedFolders.has(folderId),
  
  toggleList: (listId) => set((state) => {
    const newExpanded = new Set(state.expandedLists)
    if (newExpanded.has(listId)) {
      newExpanded.delete(listId)
    } else {
      newExpanded.add(listId)
    }
    return { expandedLists: newExpanded }
  }),
  
  expandList: (listId) => set((state) => {
    const newExpanded = new Set(state.expandedLists)
    newExpanded.add(listId)
    return { expandedLists: newExpanded }
  }),
  
  collapseList: (listId) => set((state) => {
    const newExpanded = new Set(state.expandedLists)
    newExpanded.delete(listId)
    return { expandedLists: newExpanded }
  }),
  
  isListExpanded: (listId) => get().expandedLists.has(listId),
}))
