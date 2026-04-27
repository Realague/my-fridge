import { HouseholdSettings } from '../models/HouseholdSettings';

export class HouseholdSettingsRepository {
  async findByHouseholdId(householdId: string): Promise<HouseholdSettings | null> {
    return await HouseholdSettings.findOne({ where: { householdId } });
  }

  async createDefault(householdId: string): Promise<HouseholdSettings> {
    return await HouseholdSettings.create({ householdId });
  }

  async update(householdId: string, data: { expirationAlertDays?: number }): Promise<HouseholdSettings | null> {
    const settings = await HouseholdSettings.findOne({ where: { householdId } });
    if (!settings) return null;
    await settings.update(data);
    return settings;
  }
}
