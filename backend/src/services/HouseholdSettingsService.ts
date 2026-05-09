import { HouseholdSettingsRepository } from '../repositories/HouseholdSettingsRepository';
import { HouseholdRepository } from '../repositories/HouseholdRepository';
import { ValidationError, UnauthorizedError, NotFoundError } from '../errors/CustomErrors';
import { HouseholdSettings } from '../models/HouseholdSettings';

export interface HouseholdSettingsResponseDto {
  householdId: string;
  expirationAlertDays: number;
  updatedAt: Date;
}

export class HouseholdSettingsService {
  constructor(
    private settingsRepository: HouseholdSettingsRepository,
    private householdRepository: HouseholdRepository
  ) {}

  async getOrCreateForHousehold(householdId: string, userId: string): Promise<HouseholdSettingsResponseDto> {
    await this.assertMember(householdId, userId);

    let settings = await this.settingsRepository.findByHouseholdId(householdId);
    if (!settings) {
      settings = await this.settingsRepository.createDefault(householdId);
    }
    return this.toResponseDto(settings);
  }

  async updateForHousehold(
    householdId: string,
    userId: string,
    data: { expirationAlertDays: number }
  ): Promise<HouseholdSettingsResponseDto> {
    await this.assertMember(householdId, userId);

    const days = Number(data.expirationAlertDays);
    if (!Number.isInteger(days) || days < 1 || days > 14) {
      throw new ValidationError('expirationAlertDays must be an integer between 1 and 14');
    }

    let settings = await this.settingsRepository.findByHouseholdId(householdId);
    if (!settings) {
      settings = await this.settingsRepository.createDefault(householdId);
    }
    await settings.update({ expirationAlertDays: days });
    return this.toResponseDto(settings);
  }

  async getAlertDaysForHousehold(householdId: string): Promise<number> {
    let settings = await this.settingsRepository.findByHouseholdId(householdId);
    if (!settings) {
      settings = await this.settingsRepository.createDefault(householdId);
    }
    return settings.expirationAlertDays;
  }

  private async assertMember(householdId: string, userId: string): Promise<void> {
    const household = await this.householdRepository.findById(householdId);
    if (!household) throw new NotFoundError('Household not found');
    const isMember = await this.householdRepository.isMember(householdId, userId);
    if (!isMember) throw new UnauthorizedError('Access denied. You are not a member of this household.');
  }

  private toResponseDto(settings: HouseholdSettings): HouseholdSettingsResponseDto {
    return {
      householdId: settings.householdId,
      expirationAlertDays: settings.expirationAlertDays,
      updatedAt: settings.updatedAt,
    };
  }
}
