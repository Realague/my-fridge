import { Transaction } from 'sequelize';
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

const exitedByUserInclude = {
  model: User,
  as: 'exitedByUser',
  attributes: ['id', 'firstName', 'lastName', 'email'],
};

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

  async findAll(householdId: string, limit: number = 50, offset: number = 0): Promise<StockExit[]> {
    return await StockExit.findAll({
      where: { householdId },
      include: [exitedByUserInclude],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });
  }
}
