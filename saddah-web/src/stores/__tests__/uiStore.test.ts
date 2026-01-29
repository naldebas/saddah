import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useUIStore.setState({
      sidebar: { isCollapsed: false, isHidden: false },
      theme: 'system',
      viewModes: {
        deals: 'kanban',
        contacts: 'table',
        companies: 'table',
        leads: 'table',
        activities: 'table',
      },
      modal: { activeModal: null, modalData: {} },
      isCommandPaletteOpen: false,
      isNotificationPanelOpen: false,
    });
  });

  describe('sidebar', () => {
    it('toggles sidebar collapsed state', () => {
      const store = useUIStore.getState();
      expect(store.sidebar.isCollapsed).toBe(false);

      store.toggleSidebar();
      expect(useUIStore.getState().sidebar.isCollapsed).toBe(true);

      store.toggleSidebar();
      expect(useUIStore.getState().sidebar.isCollapsed).toBe(false);
    });

    it('sets sidebar collapsed directly', () => {
      const store = useUIStore.getState();
      store.setSidebarCollapsed(true);
      expect(useUIStore.getState().sidebar.isCollapsed).toBe(true);

      store.setSidebarCollapsed(false);
      expect(useUIStore.getState().sidebar.isCollapsed).toBe(false);
    });

    it('sets sidebar hidden state', () => {
      const store = useUIStore.getState();
      store.setSidebarHidden(true);
      expect(useUIStore.getState().sidebar.isHidden).toBe(true);
    });
  });

  describe('theme', () => {
    it('sets theme correctly', () => {
      const store = useUIStore.getState();
      expect(store.theme).toBe('system');

      store.setTheme('dark');
      expect(useUIStore.getState().theme).toBe('dark');

      store.setTheme('light');
      expect(useUIStore.getState().theme).toBe('light');
    });
  });

  describe('viewModes', () => {
    it('sets view mode for an entity', () => {
      const store = useUIStore.getState();
      expect(store.viewModes.contacts).toBe('table');

      store.setViewMode('contacts', 'grid');
      expect(useUIStore.getState().viewModes.contacts).toBe('grid');
    });

    it('gets view mode for an entity', () => {
      const store = useUIStore.getState();
      expect(store.getViewMode('deals')).toBe('kanban');
      expect(store.getViewMode('contacts')).toBe('table');
    });

    it('returns table as default for unknown entities', () => {
      const store = useUIStore.getState();
      expect(store.getViewMode('unknown' as any)).toBe('table');
    });
  });

  describe('modal', () => {
    it('opens modal with id', () => {
      const store = useUIStore.getState();
      store.openModal('create-contact');
      expect(useUIStore.getState().modal.activeModal).toBe('create-contact');
    });

    it('opens modal with data', () => {
      const store = useUIStore.getState();
      store.openModal('edit-contact', { contactId: '123' });
      expect(useUIStore.getState().modal.activeModal).toBe('edit-contact');
      expect(useUIStore.getState().modal.modalData).toEqual({ contactId: '123' });
    });

    it('closes modal and clears data', () => {
      const store = useUIStore.getState();
      store.openModal('create-contact', { data: 'test' });
      store.closeModal();
      expect(useUIStore.getState().modal.activeModal).toBeNull();
      expect(useUIStore.getState().modal.modalData).toEqual({});
    });
  });

  describe('commandPalette', () => {
    it('toggles command palette', () => {
      const store = useUIStore.getState();
      expect(store.isCommandPaletteOpen).toBe(false);

      store.toggleCommandPalette();
      expect(useUIStore.getState().isCommandPaletteOpen).toBe(true);

      store.toggleCommandPalette();
      expect(useUIStore.getState().isCommandPaletteOpen).toBe(false);
    });

    it('sets command palette open state', () => {
      const store = useUIStore.getState();
      store.setCommandPaletteOpen(true);
      expect(useUIStore.getState().isCommandPaletteOpen).toBe(true);
    });
  });

  describe('notificationPanel', () => {
    it('toggles notification panel', () => {
      const store = useUIStore.getState();
      expect(store.isNotificationPanelOpen).toBe(false);

      store.toggleNotificationPanel();
      expect(useUIStore.getState().isNotificationPanelOpen).toBe(true);
    });

    it('sets notification panel open state', () => {
      const store = useUIStore.getState();
      store.setNotificationPanelOpen(true);
      expect(useUIStore.getState().isNotificationPanelOpen).toBe(true);
    });
  });
});
