import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface FilterPreferences {
  search?: string;
  status?: string;
  source?: string;
  ownerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | undefined;
}

interface EntityFilters {
  contacts: FilterPreferences;
  companies: FilterPreferences;
  deals: FilterPreferences;
  leads: FilterPreferences;
  activities: FilterPreferences;
}

interface FilterState {
  filters: EntityFilters;

  // Get filters for an entity
  getFilters: (entity: keyof EntityFilters) => FilterPreferences;

  // Set a single filter for an entity
  setFilter: (
    entity: keyof EntityFilters,
    key: string,
    value: string | undefined
  ) => void;

  // Set multiple filters at once
  setFilters: (entity: keyof EntityFilters, filters: FilterPreferences) => void;

  // Clear all filters for an entity
  clearFilters: (entity: keyof EntityFilters) => void;

  // Clear all filters for all entities
  clearAllFilters: () => void;

  // Selected pipeline for deals view
  selectedPipelineId: string | null;
  setSelectedPipelineId: (id: string | null) => void;

  // Date range for reports/analytics
  dateRange: {
    start: string | null;
    end: string | null;
  };
  setDateRange: (start: string | null, end: string | null) => void;
}

const defaultFilters: EntityFilters = {
  contacts: { sortBy: 'createdAt', sortOrder: 'desc' },
  companies: { sortBy: 'createdAt', sortOrder: 'desc' },
  deals: { sortBy: 'createdAt', sortOrder: 'desc' },
  leads: { sortBy: 'createdAt', sortOrder: 'desc' },
  activities: { sortBy: 'dueDate', sortOrder: 'asc' },
};

export const useFilterStore = create<FilterState>()(
  persist(
    (set, get) => ({
      filters: defaultFilters,

      getFilters: (entity) => get().filters[entity] || {},

      setFilter: (entity, key, value) =>
        set((state) => ({
          filters: {
            ...state.filters,
            [entity]: {
              ...state.filters[entity],
              [key]: value,
            },
          },
        })),

      setFilters: (entity, filters) =>
        set((state) => ({
          filters: {
            ...state.filters,
            [entity]: {
              ...state.filters[entity],
              ...filters,
            },
          },
        })),

      clearFilters: (entity) =>
        set((state) => ({
          filters: {
            ...state.filters,
            [entity]: defaultFilters[entity],
          },
        })),

      clearAllFilters: () => set({ filters: defaultFilters }),

      selectedPipelineId: null,
      setSelectedPipelineId: (id) => set({ selectedPipelineId: id }),

      dateRange: {
        start: null,
        end: null,
      },
      setDateRange: (start, end) => set({ dateRange: { start, end } }),
    }),
    {
      name: 'saddah-filters',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        filters: state.filters,
        selectedPipelineId: state.selectedPipelineId,
      }),
    }
  )
);
