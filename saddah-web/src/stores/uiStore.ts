import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark' | 'system';
type ViewMode = 'table' | 'kanban' | 'grid';

interface SidebarState {
  isCollapsed: boolean;
  isHidden: boolean;
}

interface ModalState {
  activeModal: string | null;
  modalData: Record<string, unknown>;
}

interface UIState {
  // Sidebar
  sidebar: SidebarState;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarHidden: (hidden: boolean) => void;

  // Theme
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // View preferences per entity type
  viewModes: Record<string, ViewMode>;
  setViewMode: (entity: string, mode: ViewMode) => void;
  getViewMode: (entity: string) => ViewMode;

  // Modals
  modal: ModalState;
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Command palette
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;

  // Toast/Notification panel
  isNotificationPanelOpen: boolean;
  setNotificationPanelOpen: (open: boolean) => void;
  toggleNotificationPanel: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Sidebar state
      sidebar: {
        isCollapsed: false,
        isHidden: false,
      },
      toggleSidebar: () =>
        set((state) => ({
          sidebar: { ...state.sidebar, isCollapsed: !state.sidebar.isCollapsed },
        })),
      setSidebarCollapsed: (collapsed) =>
        set((state) => ({
          sidebar: { ...state.sidebar, isCollapsed: collapsed },
        })),
      setSidebarHidden: (hidden) =>
        set((state) => ({
          sidebar: { ...state.sidebar, isHidden: hidden },
        })),

      // Theme
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      // View modes
      viewModes: {
        deals: 'kanban',
        contacts: 'table',
        companies: 'table',
        leads: 'table',
        activities: 'table',
      },
      setViewMode: (entity, mode) =>
        set((state) => ({
          viewModes: { ...state.viewModes, [entity]: mode },
        })),
      getViewMode: (entity) => get().viewModes[entity] || 'table',

      // Modal state
      modal: {
        activeModal: null,
        modalData: {},
      },
      openModal: (modalId, data = {}) =>
        set({
          modal: { activeModal: modalId, modalData: data },
        }),
      closeModal: () =>
        set({
          modal: { activeModal: null, modalData: {} },
        }),

      // Command palette
      isCommandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
      toggleCommandPalette: () =>
        set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),

      // Notification panel
      isNotificationPanelOpen: false,
      setNotificationPanelOpen: (open) => set({ isNotificationPanelOpen: open }),
      toggleNotificationPanel: () =>
        set((state) => ({ isNotificationPanelOpen: !state.isNotificationPanelOpen })),
    }),
    {
      name: 'saddah-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebar: state.sidebar,
        theme: state.theme,
        viewModes: state.viewModes,
      }),
    }
  )
);
