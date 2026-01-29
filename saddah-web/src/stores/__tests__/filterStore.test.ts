import { describe, it, expect, beforeEach } from 'vitest';
import { useFilterStore } from '../filterStore';

describe('filterStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useFilterStore.getState().clearAllFilters();
  });

  describe('getFilters', () => {
    it('returns filters for an entity', () => {
      const store = useFilterStore.getState();
      const filters = store.getFilters('contacts');
      expect(filters).toHaveProperty('sortBy');
      expect(filters).toHaveProperty('sortOrder');
    });
  });

  describe('setFilter', () => {
    it('sets a single filter for an entity', () => {
      const store = useFilterStore.getState();
      store.setFilter('contacts', 'status', 'active');
      expect(store.getFilters('contacts').status).toBe('active');
    });

    it('can set filter to undefined to clear it', () => {
      const store = useFilterStore.getState();
      store.setFilter('contacts', 'status', 'active');
      store.setFilter('contacts', 'status', undefined);
      expect(store.getFilters('contacts').status).toBeUndefined();
    });
  });

  describe('setFilters', () => {
    it('sets multiple filters at once', () => {
      const store = useFilterStore.getState();
      store.setFilters('leads', {
        status: 'new',
        source: 'whatsapp_bot',
        search: 'محمد',
      });
      const filters = store.getFilters('leads');
      expect(filters.status).toBe('new');
      expect(filters.source).toBe('whatsapp_bot');
      expect(filters.search).toBe('محمد');
    });

    it('merges with existing filters', () => {
      const store = useFilterStore.getState();
      store.setFilter('leads', 'status', 'new');
      store.setFilters('leads', { source: 'manual' });
      const filters = store.getFilters('leads');
      expect(filters.status).toBe('new');
      expect(filters.source).toBe('manual');
    });
  });

  describe('clearFilters', () => {
    it('resets filters for an entity to defaults', () => {
      const store = useFilterStore.getState();
      store.setFilters('contacts', { status: 'active', search: 'test' });
      store.clearFilters('contacts');
      const filters = store.getFilters('contacts');
      expect(filters.status).toBeUndefined();
      expect(filters.search).toBeUndefined();
      expect(filters.sortBy).toBe('createdAt');
    });

    it('does not affect other entities', () => {
      const store = useFilterStore.getState();
      store.setFilter('contacts', 'status', 'active');
      store.setFilter('leads', 'status', 'new');
      store.clearFilters('contacts');
      expect(store.getFilters('leads').status).toBe('new');
    });
  });

  describe('clearAllFilters', () => {
    it('resets all entity filters to defaults', () => {
      const store = useFilterStore.getState();
      store.setFilter('contacts', 'status', 'active');
      store.setFilter('leads', 'status', 'new');
      store.setFilter('deals', 'status', 'won');
      store.clearAllFilters();
      expect(store.getFilters('contacts').status).toBeUndefined();
      expect(store.getFilters('leads').status).toBeUndefined();
      expect(store.getFilters('deals').status).toBeUndefined();
    });
  });

  describe('selectedPipelineId', () => {
    it('sets and gets selected pipeline id', () => {
      const store = useFilterStore.getState();
      expect(store.selectedPipelineId).toBeNull();

      store.setSelectedPipelineId('pipeline-1');
      expect(useFilterStore.getState().selectedPipelineId).toBe('pipeline-1');

      store.setSelectedPipelineId(null);
      expect(useFilterStore.getState().selectedPipelineId).toBeNull();
    });
  });

  describe('dateRange', () => {
    it('sets and gets date range', () => {
      const store = useFilterStore.getState();
      expect(store.dateRange.start).toBeNull();
      expect(store.dateRange.end).toBeNull();

      store.setDateRange('2024-01-01', '2024-01-31');
      const state = useFilterStore.getState();
      expect(state.dateRange.start).toBe('2024-01-01');
      expect(state.dateRange.end).toBe('2024-01-31');
    });

    it('can clear date range', () => {
      const store = useFilterStore.getState();
      store.setDateRange('2024-01-01', '2024-01-31');
      store.setDateRange(null, null);
      const state = useFilterStore.getState();
      expect(state.dateRange.start).toBeNull();
      expect(state.dateRange.end).toBeNull();
    });
  });

  describe('default sort settings', () => {
    it('has correct default sort for contacts', () => {
      const store = useFilterStore.getState();
      const filters = store.getFilters('contacts');
      expect(filters.sortBy).toBe('createdAt');
      expect(filters.sortOrder).toBe('desc');
    });

    it('has correct default sort for activities', () => {
      const store = useFilterStore.getState();
      const filters = store.getFilters('activities');
      expect(filters.sortBy).toBe('dueDate');
      expect(filters.sortOrder).toBe('asc');
    });
  });
});
