import { Transaction, Op, fn, col, WhereOptions } from 'sequelize';
import { StockExit } from '../models/StockExit';
import { User } from '../models/User';
import { StockExitType, Unit } from '../types/enums';

export interface CreateStockExitData {
  householdId: string;
  storedItemId: string | null;
  itemId: string | null;
  exitType: StockExitType;
  quantity: number;
  unit: Unit;
  exitedBy: string;
  itemNameSnapshot: string | null;
  categorySnapshot: string | null;
  storageAreaIdSnapshot: string | null;
  storageAreaNameSnapshot: string | null;
  expirationDateSnapshot: Date | null;
  restoreSnapshot: Record<string, unknown> | null;
}

// Optional filters shared by the journal list and its aggregates.
export interface StockExitFilters {
  from?: Date;
  to?: Date;
  exitType?: StockExitType;
  exitedBy?: string;
}

export interface ListStockExitsOptions extends StockExitFilters {
  limit?: number;
  offset?: number;
}

// Raw shape returned by the GROUP BY exitType aggregate.
export interface StockExitTypeCount {
  exitType: StockExitType;
  count: number;
}

const exitedByUserInclude = {
  model: User,
  as: 'exitedByUser',
  attributes: ['id', 'firstName', 'lastName', 'email'],
};

// Build the WHERE clause shared by list + count from the optional filters.
function buildWhere(householdId: string, filters: StockExitFilters): WhereOptions {
  const where: Record<string, unknown> = { householdId };

  if (filters.from || filters.to) {
    const createdAt: Record<symbol, Date> = {};
    if (filters.from) createdAt[Op.gte] = filters.from;
    if (filters.to) createdAt[Op.lt] = filters.to;
    where.createdAt = createdAt;
  }
  if (filters.exitType) where.exitType = filters.exitType;
  if (filters.exitedBy) where.exitedBy = filters.exitedBy;

  return where as WhereOptions;
}

export class StockExitRepository {
  async create(
    data: CreateStockExitData,
    options?: { transaction?: Transaction }
  ): Promise<StockExit> {
    return await StockExit.create(data, { transaction: options?.transaction });
  }

  async findById(id: string, householdId: string): Promise<StockExit | null> {
    return await StockExit.findOne({
      where: { id, householdId },
      include: [exitedByUserInclude],
    });
  }

  async delete(id: string, householdId: string): Promise<boolean> {
    const result = await StockExit.destroy({ where: { id, householdId } });
    return result > 0;
  }

  async findAll(householdId: string, options: ListStockExitsOptions = {}): Promise<StockExit[]> {
    const { limit = 50, offset = 0, ...filters } = options;
    return await StockExit.findAll({
      where: buildWhere(householdId, filters),
      include: [exitedByUserInclude],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
  }

  // Per-type totals for the summary band / tab counters. Ignores pagination.
  async countByType(householdId: string, filters: StockExitFilters = {}): Promise<StockExitTypeCount[]> {
    const rows = (await StockExit.findAll({
      where: buildWhere(householdId, filters),
      attributes: ['exitType', [fn('COUNT', col('id')), 'count']],
      group: ['exitType'],
      raw: true,
    })) as unknown as Array<{ exitType: StockExitType; count: string }>;

    return rows.map((r) => ({ exitType: r.exitType, count: Number(r.count) }));
  }
}
