import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useApiWithAuth } from '@/hooks/useApiWithAuth';
import { LoyaltyCard, CreateLoyaltyCardRequest, UpdateLoyaltyCardRequest } from '@/services/loyaltyCardService';
import { useHouseholdStore } from './householdStore';

interface LoyaltyCardStore {
  loyaltyCardsByHousehold: Record<string, LoyaltyCard[]>;
  loading: boolean;
  error: string | null;

  fetchLoyaltyCards: () => Promise<void>;
  createLoyaltyCard: (data: CreateLoyaltyCardRequest) => Promise<LoyaltyCard>;
  updateLoyaltyCard: (id: string, data: UpdateLoyaltyCardRequest) => Promise<void>;
  deleteLoyaltyCard: (id: string) => Promise<void>;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLoyaltyCardsForHousehold: (loyaltyCards: LoyaltyCard[]) => void;
  addLoyaltyCardToHousehold: (loyaltyCard: LoyaltyCard) => void;
  updateLoyaltyCardInHousehold: (loyaltyCard: LoyaltyCard) => void;
  removeLoyaltyCardFromHousehold: (loyaltyCardId: string) => void;

  getLoyaltyCardsForHousehold: () => LoyaltyCard[];
  getLoyaltyCardById: (id: string) => LoyaltyCard | null;
}

const getHouseholdId = (): string | null => {
  const selectedHouseholdId = useHouseholdStore.getState().selectedHouseholdId;
  if (selectedHouseholdId) return selectedHouseholdId;

  const households = useHouseholdStore.getState().households;
  if (households.length > 0) {
    return households[0].id;
  }

  return null;
};

let apiInstance: ReturnType<typeof useApiWithAuth> | null = null;

const getApi = () => {
  if (!apiInstance) {
    console.warn('API instance not initialized. Store operations will be skipped.');
    return null;
  }
  return apiInstance;
};

export const initializeLoyaltyCardStore = (api: ReturnType<typeof useApiWithAuth>) => {
  apiInstance = api;
};

export const useLoyaltyCardStore = create<LoyaltyCardStore>()(
  devtools(
    (set, get) => ({
      loyaltyCardsByHousehold: {},
      loading: false,
      error: null,

      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      setLoyaltyCardsForHousehold: (loyaltyCards: LoyaltyCard[]) => {
        const householdId = getHouseholdId();
        if (!householdId) return;
        set(state => ({
          loyaltyCardsByHousehold: {
            ...state.loyaltyCardsByHousehold,
            [householdId]: loyaltyCards
          }
        }));
      },

      addLoyaltyCardToHousehold: (loyaltyCard: LoyaltyCard) => {
        const householdId = getHouseholdId();
        if (!householdId) return;
        set(state => ({
          loyaltyCardsByHousehold: {
            ...state.loyaltyCardsByHousehold,
            [householdId]: [...(state.loyaltyCardsByHousehold[householdId] || []), loyaltyCard]
          }
        }));
      },

      updateLoyaltyCardInHousehold: (updatedCard: LoyaltyCard) => {
        const householdId = getHouseholdId();
        if (!householdId) return;
        set(state => ({
          loyaltyCardsByHousehold: {
            ...state.loyaltyCardsByHousehold,
            [householdId]: (state.loyaltyCardsByHousehold[householdId] || []).map(card =>
              card.id === updatedCard.id ? updatedCard : card
            )
          }
        }));
      },

      removeLoyaltyCardFromHousehold: (loyaltyCardId: string) => {
        const householdId = getHouseholdId();
        if (!householdId) return;
        set(state => ({
          loyaltyCardsByHousehold: {
            ...state.loyaltyCardsByHousehold,
            [householdId]: (state.loyaltyCardsByHousehold[householdId] || []).filter(card => card.id !== loyaltyCardId)
          }
        }));
      },

      fetchLoyaltyCards: async () => {
        const householdId = getHouseholdId();
        if (!householdId) return;

        const api = getApi();
        if (!api) return;

        set({ loading: true, error: null });

        try {
          const response = await api.get(`/api/households/${householdId}/loyalty-cards`);

          if (response.ok) {
            const responseData = await response.json();
            if (responseData.success) {
              get().setLoyaltyCardsForHousehold(responseData.data?.loyaltyCards || []);
            } else {
              throw new Error(responseData.message || 'Failed to fetch loyalty cards');
            }
          } else {
            const errorText = await response.text();
            console.error('fetchLoyaltyCards: Error response:', response.status, errorText);
            throw new Error(`Failed to fetch loyalty cards: ${response.status}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch loyalty cards';
          set({ error: message });
        } finally {
          set({ loading: false });
        }
      },

      createLoyaltyCard: async (data: CreateLoyaltyCardRequest) => {
        const householdId = getHouseholdId();
        if (!householdId) throw new Error('No household ID provided');

        const api = getApi();
        if (!api) throw new Error('API not initialized');

        set({ loading: true, error: null });

        try {
          const response = await api.post(`/api/households/${householdId}/loyalty-cards`, data);

          if (response.ok) {
            const responseData = await response.json();
            if (responseData.success) {
              get().addLoyaltyCardToHousehold(responseData.data);
              return responseData.data;
            } else {
              throw new Error(responseData.message || 'Failed to create loyalty card');
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to create loyalty card: ${response.status}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create loyalty card';
          set({ error: message });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      updateLoyaltyCard: async (id: string, data: UpdateLoyaltyCardRequest) => {
        const householdId = getHouseholdId();
        if (!householdId) throw new Error('No household ID provided');

        const api = getApi();
        if (!api) throw new Error('API not initialized');

        set({ loading: true, error: null });

        try {
          const response = await api.put(`/api/households/${householdId}/loyalty-cards/${id}`, data);

          if (response.ok) {
            const responseData = await response.json();
            if (responseData.success) {
              get().updateLoyaltyCardInHousehold(responseData.data);
            } else {
              throw new Error(responseData.message || 'Failed to update loyalty card');
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to update loyalty card: ${response.status}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update loyalty card';
          set({ error: message });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      deleteLoyaltyCard: async (id: string) => {
        const householdId = getHouseholdId();
        if (!householdId) throw new Error('No household ID provided');

        const api = getApi();
        if (!api) throw new Error('API not initialized');

        set({ loading: true, error: null });

        try {
          const response = await api.delete(`/api/households/${householdId}/loyalty-cards/${id}`);

          if (response.ok) {
            const responseData = await response.json();
            if (responseData.success) {
              get().removeLoyaltyCardFromHousehold(id);
            } else {
              throw new Error(responseData.message || 'Failed to delete loyalty card');
            }
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to delete loyalty card: ${response.status}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to delete loyalty card';
          set({ error: message });
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      getLoyaltyCardsForHousehold: () => {
        const householdId = getHouseholdId();
        if (!householdId) return [];
        return get().loyaltyCardsByHousehold[householdId] || [];
      },

      getLoyaltyCardById: (id: string) => {
        const householdId = getHouseholdId();
        if (!householdId) return null;
        const cards = get().loyaltyCardsByHousehold[householdId] || [];
        return cards.find(card => card.id === id) || null;
      },
    }),
    {
      name: 'loyalty-card-store',
    }
  )
);
