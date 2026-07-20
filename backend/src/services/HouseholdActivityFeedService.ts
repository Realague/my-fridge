import { HouseholdActivityRepository } from '../repositories/HouseholdActivityRepository';
import { HouseholdActivity } from '../models/HouseholdActivity';
import { HouseholdMember } from '../models/HouseholdMember';
import { HouseholdActivityAction, HouseholdActivityTargetType } from '../types/enums';

export interface ActivityActorDto {
  id: string;
  // null when the author has no name on file (e.g. deleted user): the frontend
  // supplies a localized fallback. The backend never bakes user-facing strings.
  name: string | null;
  isFormerMember: boolean;
}

export interface ActivityEntryDto {
  id: string;
  action: HouseholdActivityAction;
  targetType: HouseholdActivityTargetType | null;
  targetId: string | null;
  itemNameSnapshot: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: ActivityActorDto;
}

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export class HouseholdActivityFeedService {
  private repo: HouseholdActivityRepository;

  constructor(repo?: HouseholdActivityRepository) {
    this.repo = repo || new HouseholdActivityRepository();
  }

  async getFeed(
    householdId: string,
    opts: { limit?: number; before?: string } = {}
  ): Promise<{ entries: ActivityEntryDto[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(1, opts.limit ?? DEFAULT_LIMIT), MAX_LIMIT);
    const { rows, nextCursor } = await this.repo.getFeed(householdId, { limit, before: opts.before });

    const activeMemberIds = await this.activeMemberIds(householdId);
    const entries = rows.map((row) => this.toDto(row, activeMemberIds));

    return { entries, nextCursor };
  }

  async getRecent(householdId: string, limit = 5): Promise<{ entries: ActivityEntryDto[] }> {
    const { entries } = await this.getFeed(householdId, { limit });
    return { entries };
  }

  private async activeMemberIds(householdId: string): Promise<Set<string>> {
    const members = await HouseholdMember.findAll({
      where: { householdId, isActive: true },
      attributes: ['userId'],
      raw: true,
    });
    return new Set(members.map((m: any) => m.userId));
  }

  private toDto(row: HouseholdActivity, activeMemberIds: Set<string>): ActivityEntryDto {
    const firstName = row.user?.firstName?.trim();
    const lastName = row.user?.lastName?.trim();
    const name = [firstName, lastName].filter(Boolean).join(' ') || null;

    return {
      id: row.id,
      action: row.action,
      targetType: row.targetType,
      targetId: row.targetId,
      itemNameSnapshot: row.itemNameSnapshot,
      metadata: row.metadata,
      createdAt: new Date(row.createdAt).toISOString(),
      actor: {
        id: row.userId,
        name,
        isFormerMember: !activeMemberIds.has(row.userId),
      },
    };
  }
}
