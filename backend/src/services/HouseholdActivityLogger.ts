import {
  HouseholdActivityRepository,
  CreateHouseholdActivityData,
} from '../repositories/HouseholdActivityRepository';

// Best-effort activity logging. Deliberately swallows all errors: losing a
// ranking signal must never break the user's action. Runs outside any live
// transaction at every call site, so a failed insert cannot poison one.
export class HouseholdActivityLogger {
  private repo: HouseholdActivityRepository;

  constructor(repo?: HouseholdActivityRepository) {
    this.repo = repo || new HouseholdActivityRepository();
  }

  async log(data: CreateHouseholdActivityData): Promise<void> {
    try {
      await this.repo.create(data);
    } catch (error) {
      console.error('[HouseholdActivityLogger] failed to log activity', error);
    }
  }
}
