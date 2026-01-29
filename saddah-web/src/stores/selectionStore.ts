import { create } from 'zustand';

type EntityType = 'contacts' | 'companies' | 'deals' | 'leads' | 'activities' | 'notifications';

interface SelectionState {
  // Selected items per entity type
  selections: Record<EntityType, Set<string>>;

  // Check if an item is selected
  isSelected: (entity: EntityType, id: string) => boolean;

  // Select a single item
  select: (entity: EntityType, id: string) => void;

  // Deselect a single item
  deselect: (entity: EntityType, id: string) => void;

  // Toggle selection
  toggle: (entity: EntityType, id: string) => void;

  // Select multiple items
  selectMultiple: (entity: EntityType, ids: string[]) => void;

  // Select all items (pass IDs of all visible items)
  selectAll: (entity: EntityType, ids: string[]) => void;

  // Deselect all items for an entity
  deselectAll: (entity: EntityType) => void;

  // Get selected items as array
  getSelectedIds: (entity: EntityType) => string[];

  // Get selection count
  getSelectionCount: (entity: EntityType) => number;

  // Check if any items are selected
  hasSelection: (entity: EntityType) => boolean;

  // Clear all selections (all entities)
  clearAllSelections: () => void;
}

const createEmptySelections = (): Record<EntityType, Set<string>> => ({
  contacts: new Set(),
  companies: new Set(),
  deals: new Set(),
  leads: new Set(),
  activities: new Set(),
  notifications: new Set(),
});

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selections: createEmptySelections(),

  isSelected: (entity, id) => get().selections[entity].has(id),

  select: (entity, id) =>
    set((state) => {
      const newSet = new Set(state.selections[entity]);
      newSet.add(id);
      return {
        selections: {
          ...state.selections,
          [entity]: newSet,
        },
      };
    }),

  deselect: (entity, id) =>
    set((state) => {
      const newSet = new Set(state.selections[entity]);
      newSet.delete(id);
      return {
        selections: {
          ...state.selections,
          [entity]: newSet,
        },
      };
    }),

  toggle: (entity, id) => {
    const { isSelected, select, deselect } = get();
    if (isSelected(entity, id)) {
      deselect(entity, id);
    } else {
      select(entity, id);
    }
  },

  selectMultiple: (entity, ids) =>
    set((state) => {
      const newSet = new Set(state.selections[entity]);
      ids.forEach((id) => newSet.add(id));
      return {
        selections: {
          ...state.selections,
          [entity]: newSet,
        },
      };
    }),

  selectAll: (entity, ids) =>
    set((state) => ({
      selections: {
        ...state.selections,
        [entity]: new Set(ids),
      },
    })),

  deselectAll: (entity) =>
    set((state) => ({
      selections: {
        ...state.selections,
        [entity]: new Set(),
      },
    })),

  getSelectedIds: (entity) => Array.from(get().selections[entity]),

  getSelectionCount: (entity) => get().selections[entity].size,

  hasSelection: (entity) => get().selections[entity].size > 0,

  clearAllSelections: () => set({ selections: createEmptySelections() }),
}));

/**
 * Hook for using selection state for a specific entity type
 * Provides a simpler API when working with a single entity
 */
export function useEntitySelection(entity: EntityType) {
  const store = useSelectionStore();

  return {
    selectedIds: store.getSelectedIds(entity),
    selectionCount: store.getSelectionCount(entity),
    hasSelection: store.hasSelection(entity),
    isSelected: (id: string) => store.isSelected(entity, id),
    select: (id: string) => store.select(entity, id),
    deselect: (id: string) => store.deselect(entity, id),
    toggle: (id: string) => store.toggle(entity, id),
    selectMultiple: (ids: string[]) => store.selectMultiple(entity, ids),
    selectAll: (ids: string[]) => store.selectAll(entity, ids),
    deselectAll: () => store.deselectAll(entity),
  };
}
