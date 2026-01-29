import { describe, it, expect, beforeEach } from 'vitest';
import { useSearchStore } from '../searchStore';

describe('searchStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useSearchStore.getState().resetSearch();
    useSearchStore.getState().clearRecentSearches();
  });

  describe('query', () => {
    it('sets search query', () => {
      const store = useSearchStore.getState();
      store.setQuery('test query');
      expect(useSearchStore.getState().query).toBe('test query');
    });

    it('can clear query by setting empty string', () => {
      const store = useSearchStore.getState();
      store.setQuery('test');
      store.setQuery('');
      expect(useSearchStore.getState().query).toBe('');
    });
  });

  describe('scope', () => {
    it('sets search scope', () => {
      const store = useSearchStore.getState();
      expect(store.scope).toBe('all');

      store.setScope('contacts');
      expect(useSearchStore.getState().scope).toBe('contacts');

      store.setScope('deals');
      expect(useSearchStore.getState().scope).toBe('deals');
    });
  });

  describe('isSearchActive', () => {
    it('sets search active state', () => {
      const store = useSearchStore.getState();
      expect(store.isSearchActive).toBe(false);

      store.setSearchActive(true);
      expect(useSearchStore.getState().isSearchActive).toBe(true);
    });
  });

  describe('recentSearches', () => {
    it('adds a recent search', () => {
      const store = useSearchStore.getState();
      store.addRecentSearch('test search');
      expect(useSearchStore.getState().recentSearches.length).toBe(1);
      expect(useSearchStore.getState().recentSearches[0].query).toBe('test search');
    });

    it('includes current scope in recent search', () => {
      const store = useSearchStore.getState();
      store.setScope('contacts');
      store.addRecentSearch('contact search');
      expect(useSearchStore.getState().recentSearches[0].scope).toBe('contacts');
    });

    it('does not add empty searches', () => {
      const store = useSearchStore.getState();
      store.addRecentSearch('');
      store.addRecentSearch('   ');
      expect(useSearchStore.getState().recentSearches.length).toBe(0);
    });

    it('trims whitespace from searches', () => {
      const store = useSearchStore.getState();
      store.addRecentSearch('  test  ');
      expect(useSearchStore.getState().recentSearches[0].query).toBe('test');
    });

    it('removes duplicate searches', () => {
      const store = useSearchStore.getState();
      store.addRecentSearch('test');
      store.addRecentSearch('test');
      expect(useSearchStore.getState().recentSearches.length).toBe(1);
    });

    it('moves duplicate to front of list', () => {
      const store = useSearchStore.getState();
      store.addRecentSearch('first');
      store.addRecentSearch('second');
      store.addRecentSearch('first');
      const searches = useSearchStore.getState().recentSearches;
      expect(searches[0].query).toBe('first');
      expect(searches[1].query).toBe('second');
    });

    it('limits to 10 recent searches', () => {
      const store = useSearchStore.getState();
      for (let i = 0; i < 15; i++) {
        store.addRecentSearch(`search ${i}`);
      }
      expect(useSearchStore.getState().recentSearches.length).toBe(10);
    });

    it('clears recent searches', () => {
      const store = useSearchStore.getState();
      store.addRecentSearch('test1');
      store.addRecentSearch('test2');
      store.clearRecentSearches();
      expect(useSearchStore.getState().recentSearches.length).toBe(0);
    });
  });

  describe('resetSearch', () => {
    it('resets query, scope, and active state', () => {
      const store = useSearchStore.getState();
      store.setQuery('test');
      store.setScope('contacts');
      store.setSearchActive(true);
      store.resetSearch();
      const state = useSearchStore.getState();
      expect(state.query).toBe('');
      expect(state.scope).toBe('all');
      expect(state.isSearchActive).toBe(false);
    });

    it('does not clear recent searches', () => {
      const store = useSearchStore.getState();
      store.addRecentSearch('test');
      store.resetSearch();
      expect(useSearchStore.getState().recentSearches.length).toBe(1);
    });
  });

  describe('recent search timestamp', () => {
    it('adds timestamp to recent searches', () => {
      const store = useSearchStore.getState();
      const before = Date.now();
      store.addRecentSearch('test');
      const after = Date.now();
      const timestamp = useSearchStore.getState().recentSearches[0].timestamp;
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });
});
