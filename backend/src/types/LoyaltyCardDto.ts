import { BarcodeFormat } from './enums';

export interface CreateLoyaltyCardDto {
  householdId: string;
  storeSlug?: string;
  storeName: string;
  cardNumber: string;
  barcodeData?: string;
  barcodeFormat?: BarcodeFormat;
  notes?: string;
  color?: string;
  createdBy: string;
}

export interface UpdateLoyaltyCardDto {
  storeSlug?: string;
  storeName?: string;
  cardNumber?: string;
  barcodeData?: string;
  barcodeFormat?: BarcodeFormat;
  notes?: string;
  color?: string;
}

export interface LoyaltyCardDto {
  id: string;
  householdId: string;
  storeSlug: string | null;
  storeName: string;
  cardNumber: string;
  barcodeData: string | null;
  barcodeFormat: BarcodeFormat | null;
  notes: string | null;
  color: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    email: string;
  };
  household?: {
    id: string;
    name: string;
  };
}

export interface GetLoyaltyCardsQueryDto {
  householdId: string;
  limit?: number;
  offset?: number;
}
