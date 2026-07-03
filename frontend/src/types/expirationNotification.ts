export type ExpirationNotificationPhase = 'initial' | 'reminder' | 'exit_suggestion';
export type ExpirationUrgency = 'expired' | 'today' | 'tomorrow' | 'soon';

export interface ExpirationNotification {
  id: string;
  storedItemId: string | null;
  phase: ExpirationNotificationPhase;
  itemName: string;
  itemHouseholdId: string | null;
  storageAreaId: string | null;
  storageAreaName: string | null;
  expirationDate: string;
  isOpened: boolean;
  openedDate: string | null;
  quantity: number | null;
  unit: string | null;
  createdAt: string;
  readByCurrentUser: boolean;
}

export interface ExpirationNotificationListResponse {
  notifications: ExpirationNotification[];
  unreadCount: number;
}

export interface ExpiringNowItem {
  storedItemId: string;
  itemId: string;
  itemName: string;
  itemHouseholdId: string | null;
  itemImageUrl: string | null;
  storageAreaId: string;
  storageAreaName: string;
  storageAreaType: string;
  quantity: number;
  unit: string;
  isOpened: boolean;
  openedDate: string | null;
  expirationDate: string;
  daysUntilExpiration: number;
  urgency: ExpirationUrgency;
}

export interface ExpiringNowResponse {
  alertDays: number;
  total: number;
  items: ExpiringNowItem[];
}

export interface HouseholdSettings {
  householdId: string;
  expirationAlertDays: number;
  exitSuggestionsEnabled: boolean;
  updatedAt: string;
}
