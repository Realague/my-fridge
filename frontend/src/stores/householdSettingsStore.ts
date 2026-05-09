import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { householdSettingsService } from '@/services/householdSettingsService';
import { HouseholdSettings } from '@/types/expirationNotification';

interface HouseholdSettingsStore {
  settingsByHousehold: Record<string, HouseholdSettings>;
  loading: boolean;
  error: string | null;

  fetch: (householdId: string) => Promise<HouseholdSettings | null>;
  update: (householdId: string, dto: { expirationAlertDays: number }) => Promise<HouseholdSettings>;

  getSettings: (householdId: string | null | undefined) => HouseholdSettings | null;
  reset: () => void;
}

export const useHouseholdSettingsStore = create<HouseholdSettingsStore>()(
  devtools(
    (set, get) => ({
      settingsByHousehold: {},
      loading: false,
      error: null,

      fetch: async (householdId: string) => {
        if (!householdId) return null;
        set({ loading: true, error: null });
        try {
          const settings = await householdSettingsService.get(householdId);
          set((state) => ({
            settingsByHousehold: { ...state.settingsByHousehold, [householdId]: settings },
            loading: false,
          }));
          return settings;
        } catch (error) {
          console.error('Fetch household settings failed', error);
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load settings',
          });
          return null;
        }
      },

      update: async (householdId: string, dto) => {
        const previous = get().settingsByHousehold[householdId];
        if (previous) {
          set((state) => ({
            settingsByHousehold: {
              ...state.settingsByHousehold,
              [householdId]: { ...previous, expirationAlertDays: dto.expirationAlertDays },
            },
          }));
        }
        try {
          const settings = await householdSettingsService.update(householdId, dto);
          set((state) => ({
            settingsByHousehold: { ...state.settingsByHousehold, [householdId]: settings },
          }));
          return settings;
        } catch (error) {
          if (previous) {
            set((state) => ({
              settingsByHousehold: { ...state.settingsByHousehold, [householdId]: previous },
            }));
          }
          throw error;
        }
      },

      getSettings: (householdId) => {
        if (!householdId) return null;
        return get().settingsByHousehold[householdId] ?? null;
      },

      reset: () => set({ settingsByHousehold: {}, loading: false, error: null }),
    }),
    { name: 'householdSettingsStore' }
  )
);
