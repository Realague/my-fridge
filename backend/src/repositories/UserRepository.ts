import { User } from '../models';
import { Op } from 'sequelize';

export interface FindUserOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
}

export class UserRepository {
  
  async findById(id: string): Promise<any> {
    return await User.findByPk(id, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'lowStockAlertsEnabled', 'googleId', 'selectedHouseholdId', 'refreshToken', 'refreshTokenExpiresAt', 'createdAt', 'updatedAt']
    });
  }

  async findByEmail(email: string): Promise<any> {
    return await User.findOne({
      where: { email },
      attributes: ['id', 'firstName', 'lastName', 'email', 'lowStockAlertsEnabled', 'googleId', 'selectedHouseholdId','createdAt', 'updatedAt']
    });
  }

  async findByGoogleId(googleId: string): Promise<any> {
    return await User.findOne({
      where: { googleId },
      attributes: ['id', 'firstName', 'lastName', 'email', 'lowStockAlertsEnabled', 'googleId', 'selectedHouseholdId', 'refreshToken', 'refreshTokenExpiresAt', 'createdAt', 'updatedAt']
    });
  }

  async findByRefreshToken(refreshToken: string): Promise<any> {
    return await User.findOne({
      where: { refreshToken },
      attributes: ['id', 'firstName', 'lastName', 'email', 'lowStockAlertsEnabled', 'googleId', 'selectedHouseholdId', 'refreshToken', 'refreshTokenExpiresAt', 'createdAt', 'updatedAt']
    });
  }

  async findAll(options: FindUserOptions = {}): Promise<any[]> {
    const whereClause: any = {};

    // Add search functionality
    if (options.search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${options.search}%` } },
        { lastName: { [Op.iLike]: `%${options.search}%` } },
        { email: { [Op.iLike]: `%${options.search}%` } }
      ];
    }

    return await User.findAll({
      where: whereClause,
      attributes: ['id', 'firstName', 'lastName', 'email', 'lowStockAlertsEnabled', 'googleId', 'selectedHouseholdId','createdAt', 'updatedAt'],
      limit: options.limit,
      offset: options.offset,
      order: options.sortBy ? [[options.sortBy, options.sortOrder || 'DESC']] : undefined
    });
  }

  async create(data: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<any> {
    return await User.create(data);
  }

  async update(id: string, data: Partial<{
    firstName: string;
    lastName: string;
    lowStockAlertsEnabled: boolean;
    selectedHouseholdId: string;
  }>): Promise<[number]> {
    return await User.update(data, {
      where: { id }
    });
  }

  async updateRefreshToken(id: string, refreshToken: string | null, expiresAt: Date | null): Promise<number> {
    const [affectedCount] = await User.update({
      refreshToken: refreshToken || undefined,
      refreshTokenExpiresAt: expiresAt || undefined
    }, {
      where: { id }
    });
    return affectedCount;
  }

  async clearRefreshToken(id: string): Promise<number> {
    const [affectedCount] = await User.update({
      refreshToken: undefined,
      refreshTokenExpiresAt: undefined
    }, {
      where: { id }
    });
    return affectedCount;
  }

  async delete(id: string): Promise<number> {
    return await User.destroy({
      where: { id }
    });
  }

  async count(): Promise<number> {
    return await User.count();
  }
} 