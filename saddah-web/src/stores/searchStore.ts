import { create } from 'zustand';

type SearchScope = 'all' | 'contacts' | 'companies' | 'deals' | 'leads';

interface RecentSearch {
  query: string;
  scope: SearchScope;
  timestamp: number;
}

interface SearchState {
  // Current search query
  query: string;
  setQuery: (query: string) => void;

  // Search scope (filter by entity type)
  scope: SearchScope;
  setScope: (scope: SearchScope) => void;

  // Is search active/focused
  isSearchActive: boolean;
  setSearchActive: (active: boolean) => void;

  // Recent searches (in memory, not persisted)
  recentSearches: RecentSearch[];
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;

  // Reset search state
  resetSearch: () => void;
}

const MAX_RECENT_SEARCHES = 10;

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  setQuery: (query) => set({ query }),

  scope: 'all',
  setScope: (scope) => set({ scope }),

  isSearchActive: false,
  setSearchActive: (active) => set({ isSearchActive: active }),

  recentSearches: [],
  addRecentSearch: (query) => {
    if (!query.trim()) return;

    const { scope, recentSearches } = get();
    const newSearch: RecentSearch = {
      query: query.trim(),
      scope,
      timestamp: Date.now(),
    };

    // Remove duplicate and add to front
    const filtered = recentSearches.filter(
      (s) => !(s.query === newSearch.query && s.scope === newSearch.scope)
    );
    const updated = [newSearch, ...filtered].slice(0, MAX_RECENT_SEARCHES);

    set({ recentSearches: updated });
  },
  clearRecentSearches: () => set({ recentSearches: [] }),

  resetSearch: () =>
    set({
      query: '',
      scope: 'all',
      isSearchActive: false,
    }),
}));
