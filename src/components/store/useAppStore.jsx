
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Global Zustand store for app state
 * Replaces scattered useState and prop drilling
 */
const useAppStore = create(
  persist(
    (set, get) => ({
      // UI State
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      
      showKeyboardHelp: false,
      setShowKeyboardHelp: (show) => set({ showKeyboardHelp: show }),
      
      // User Preferences (synced state)
      currentEnergy: 'medium',
      setCurrentEnergy: (energy) => set({ currentEnergy: energy }),
      
      workMode: 'personal',
      setWorkMode: (mode) => set({ workMode: mode }),
      
      activeWidgets: [],
      setActiveWidgets: (widgets) => set({ activeWidgets: widgets }),
      
      navigationStyle: 'traditional',
      setNavigationStyle: (style) => set({ navigationStyle: style }),
      
      // Task Management
      selectedTask: null,
      setSelectedTask: (task) => set({ selectedTask: task }),
      
      selectedTaskIds: [],
      setSelectedTaskIds: (ids) => set({ selectedTaskIds: ids }),
      toggleTaskSelection: (id) => set((state) => ({
        selectedTaskIds: state.selectedTaskIds.includes(id)
          ? state.selectedTaskIds.filter(tid => tid !== id)
          : [...state.selectedTaskIds, id]
      })),
      clearSelectedTasks: () => set({ selectedTaskIds: [] }),
      
      bulkSelectMode: false,
      setBulkSelectMode: (enabled) => set({ bulkSelectMode: enabled }),
      
      // View State
      activeView: 'list',
      setActiveView: (view) => set({ activeView: view }),
      
      activeTab: 'todo',
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      // Filters
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      filterCategory: 'all',
      setFilterCategory: (category) => set({ filterCategory: category }),
      
      filterPriority: 'all',
      setFilterPriority: (priority) => set({ filterPriority: priority }),
      
      sortBy: 'created',
      setSortBy: (sort) => set({ sortBy: sort }),
      
      // Modal State
      showTaskForm: false,
      editingTask: null,
      openTaskForm: (task = null) => set({ 
        showTaskForm: true, 
        editingTask: task 
      }),
      closeTaskForm: () => set({ 
        showTaskForm: false, 
        editingTask: null 
      }),
      
      showEnergyPicker: false,
      setShowEnergyPicker: (show) => set({ showEnergyPicker: show }),
      
      // Offline State
      isOffline: false,
      setIsOffline: (offline) => set({ isOffline: offline }),
      
      pendingChanges: [],
      addPendingChange: (change) => set((state) => ({
        pendingChanges: [...state.pendingChanges, change]
      })),
      removePendingChange: (id) => set((state) => ({
        pendingChanges: state.pendingChanges.filter(c => c.id !== id)
      })),
      clearPendingChanges: () => set({ pendingChanges: [] }),
      
      // Reset
      reset: () => set({
        selectedTask: null,
        selectedTaskIds: [],
        bulkSelectMode: false,
        searchQuery: '',
        filterCategory: 'all',
        filterPriority: 'all',
        showTaskForm: false,
        editingTask: null,
      }),
    }),
    {
      name: 'propel-app-store',
      partialize: (state) => ({
        // Only persist UI preferences, not temporary state
        sidebarOpen: state.sidebarOpen,
        navigationStyle: state.navigationStyle,
        activeView: state.activeView,
        currentEnergy: state.currentEnergy,
        workMode: state.workMode,
      }),
    }
  )
);

export default useAppStore;
