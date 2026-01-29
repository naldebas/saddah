import { describe, it, expect, beforeEach } from 'vitest';
import { useSelectionStore, useEntitySelection } from '../selectionStore';

describe('selectionStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useSelectionStore.getState().clearAllSelections();
  });

  describe('select', () => {
    it('selects a single item', () => {
      const store = useSelectionStore.getState();
      store.select('contacts', 'contact-1');
      expect(store.isSelected('contacts', 'contact-1')).toBe(true);
    });

    it('can select multiple items', () => {
      const store = useSelectionStore.getState();
      store.select('contacts', 'contact-1');
      store.select('contacts', 'contact-2');
      expect(store.getSelectionCount('contacts')).toBe(2);
    });
  });

  describe('deselect', () => {
    it('deselects a single item', () => {
      const store = useSelectionStore.getState();
      store.select('contacts', 'contact-1');
      store.deselect('contacts', 'contact-1');
      expect(store.isSelected('contacts', 'contact-1')).toBe(false);
    });
  });

  describe('toggle', () => {
    it('toggles selection on', () => {
      const store = useSelectionStore.getState();
      store.toggle('contacts', 'contact-1');
      expect(store.isSelected('contacts', 'contact-1')).toBe(true);
    });

    it('toggles selection off', () => {
      const store = useSelectionStore.getState();
      store.select('contacts', 'contact-1');
      store.toggle('contacts', 'contact-1');
      expect(store.isSelected('contacts', 'contact-1')).toBe(false);
    });
  });

  describe('selectMultiple', () => {
    it('selects multiple items at once', () => {
      const store = useSelectionStore.getState();
      store.selectMultiple('contacts', ['contact-1', 'contact-2', 'contact-3']);
      expect(store.getSelectionCount('contacts')).toBe(3);
    });

    it('adds to existing selection', () => {
      const store = useSelectionStore.getState();
      store.select('contacts', 'contact-0');
      store.selectMultiple('contacts', ['contact-1', 'contact-2']);
      expect(store.getSelectionCount('contacts')).toBe(3);
    });
  });

  describe('selectAll', () => {
    it('replaces selection with provided ids', () => {
      const store = useSelectionStore.getState();
      store.select('contacts', 'contact-0');
      store.selectAll('contacts', ['contact-1', 'contact-2']);
      expect(store.getSelectionCount('contacts')).toBe(2);
      expect(store.isSelected('contacts', 'contact-0')).toBe(false);
    });
  });

  describe('deselectAll', () => {
    it('clears all selections for an entity', () => {
      const store = useSelectionStore.getState();
      store.selectMultiple('contacts', ['contact-1', 'contact-2']);
      store.deselectAll('contacts');
      expect(store.getSelectionCount('contacts')).toBe(0);
    });

    it('does not affect other entities', () => {
      const store = useSelectionStore.getState();
      store.select('contacts', 'contact-1');
      store.select('deals', 'deal-1');
      store.deselectAll('contacts');
      expect(store.isSelected('deals', 'deal-1')).toBe(true);
    });
  });

  describe('getSelectedIds', () => {
    it('returns array of selected ids', () => {
      const store = useSelectionStore.getState();
      store.selectMultiple('contacts', ['contact-1', 'contact-2']);
      const ids = store.getSelectedIds('contacts');
      expect(ids).toContain('contact-1');
      expect(ids).toContain('contact-2');
      expect(ids.length).toBe(2);
    });

    it('returns empty array when nothing selected', () => {
      const store = useSelectionStore.getState();
      expect(store.getSelectedIds('contacts')).toEqual([]);
    });
  });

  describe('hasSelection', () => {
    it('returns true when items are selected', () => {
      const store = useSelectionStore.getState();
      store.select('contacts', 'contact-1');
      expect(store.hasSelection('contacts')).toBe(true);
    });

    it('returns false when nothing selected', () => {
      const store = useSelectionStore.getState();
      expect(store.hasSelection('contacts')).toBe(false);
    });
  });

  describe('clearAllSelections', () => {
    it('clears all selections across all entities', () => {
      const store = useSelectionStore.getState();
      store.select('contacts', 'contact-1');
      store.select('deals', 'deal-1');
      store.select('leads', 'lead-1');
      store.clearAllSelections();
      expect(store.hasSelection('contacts')).toBe(false);
      expect(store.hasSelection('deals')).toBe(false);
      expect(store.hasSelection('leads')).toBe(false);
    });
  });

  describe('entity isolation', () => {
    it('keeps selections separate between entities', () => {
      const store = useSelectionStore.getState();
      store.select('contacts', 'id-1');
      store.select('deals', 'id-1');
      expect(store.getSelectionCount('contacts')).toBe(1);
      expect(store.getSelectionCount('deals')).toBe(1);
      store.deselectAll('contacts');
      expect(store.isSelected('deals', 'id-1')).toBe(true);
    });
  });
});

describe('useEntitySelection', () => {
  beforeEach(() => {
    useSelectionStore.getState().clearAllSelections();
  });

  it('provides entity-specific selection interface', () => {
    // Note: This is testing the shape of the returned object
    // Full integration would need React Testing Library with hooks
    const selection = useEntitySelection('contacts');
    expect(selection).toHaveProperty('selectedIds');
    expect(selection).toHaveProperty('selectionCount');
    expect(selection).toHaveProperty('hasSelection');
    expect(selection).toHaveProperty('isSelected');
    expect(selection).toHaveProperty('select');
    expect(selection).toHaveProperty('deselect');
    expect(selection).toHaveProperty('toggle');
    expect(selection).toHaveProperty('selectMultiple');
    expect(selection).toHaveProperty('selectAll');
    expect(selection).toHaveProperty('deselectAll');
  });
});
