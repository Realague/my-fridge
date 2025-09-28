import { StorageAreaRepository } from '../repositories/StorageAreaRepository';
import { StorageAreaType } from '../types/enums';

export interface DefaultStorageArea {
  name: string;
  emoji: string;
  type: StorageAreaType;
}

export const DEFAULT_STORAGE_AREAS: Record<string, DefaultStorageArea> = {
  fridge: {
    name: 'Fridge',
    emoji: '🥬',
    type: StorageAreaType.FRIDGE
  },
  freezer: {
    name: 'Freezer',
    emoji: '🧊',
    type: StorageAreaType.FREEZER
  },
  pantry: {
    name: 'Pantry',
    emoji: '🏺',
    type: StorageAreaType.PANTRY
  },
  kitchenCupboard: {
    name: 'Kitchen Cupboard',
    emoji: '🗄️',
    type: StorageAreaType.KITCHEN_CUPBOARD
  }
};

export class StorageAreaSeeder {
  constructor(private storageAreaRepository: StorageAreaRepository) {}

  async seedSelectedStorageAreas(
    householdId: string,
    selections: {
      hasFridge?: boolean;
      hasFreezer?: boolean;
      hasPantry?: boolean;
      hasKitchenCupboard?: boolean;
    }
  ): Promise<void> {
    try {
      // Check if storage areas already exist for this household
      const existingAreas = await this.storageAreaRepository.findByHouseholdId(householdId);
      
      if (existingAreas.length > 0) {
        console.log(`Storage areas already exist for household ${householdId}, skipping seeding`);
        return;
      }

      const areasToCreate: DefaultStorageArea[] = [];

      // Add selected storage areas
      if (selections.hasFridge && DEFAULT_STORAGE_AREAS.fridge) {
        areasToCreate.push(DEFAULT_STORAGE_AREAS.fridge);
      }
      if (selections.hasFreezer && DEFAULT_STORAGE_AREAS.freezer) {
        areasToCreate.push(DEFAULT_STORAGE_AREAS.freezer);
      }
      if (selections.hasPantry && DEFAULT_STORAGE_AREAS.pantry) {
        areasToCreate.push(DEFAULT_STORAGE_AREAS.pantry);
      }
      if (selections.hasKitchenCupboard && DEFAULT_STORAGE_AREAS.kitchenCupboard) {
        areasToCreate.push(DEFAULT_STORAGE_AREAS.kitchenCupboard);
      }

      // Create selected storage areas
      for (const defaultArea of areasToCreate) {
        await this.createStorageArea(householdId, defaultArea);
      }

      console.log(`✅ Created ${areasToCreate.length} selected storage areas for household ${householdId}`);
    } catch (error) {
      console.error(`❌ Failed to seed selected storage areas for household ${householdId}:`, error);
      throw error;
    }
  }

  public async createStorageArea(householdId: string, defaultArea: DefaultStorageArea): Promise<void> {
    await this.storageAreaRepository.create({
      name: defaultArea.name,
      emoji: defaultArea.emoji,
      type: defaultArea.type,
      householdId: householdId
    });
  }
} 