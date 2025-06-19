import { StorageArea, Household } from '../models';
import { StorageAreaType } from '../types/enums';

export interface FindOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateStorageAreaData {
  name: string;
  emoji?: string;
  type?: StorageAreaType;
  householdId: string;
}

export class StorageAreaRepository {
  
  async findById(id: string): Promise<any> {
    return await StorageArea.findByPk(id, {
      include: [
        {
          model: Household,
          as: 'household',
          attributes: ['id', 'name'],
        }
      ]
    });
  }

  async findByHouseholdId(householdId: string, options: FindOptions = {}): Promise<any[]> {
    return await StorageArea.findAll({
      where: { householdId },
      include: [
        {
          model: Household,
          as: 'household',
          attributes: ['id', 'name'],
        }
      ],
      limit: options.limit,
      offset: options.offset,
      order: options.sortBy ? [[options.sortBy, options.sortOrder || 'ASC']] : [['name', 'ASC']],
    });
  }

  async create(data: CreateStorageAreaData): Promise<any> {
    return await StorageArea.create({
      name: data.name,
      emoji: data.emoji || '📦',
      type: data.type || StorageAreaType.OTHER,
      householdId: data.householdId,
    });
  }

  async update(id: string, data: Partial<CreateStorageAreaData>): Promise<[number]> {
    return await StorageArea.update(data, {
      where: { id }
    });
  }

  async delete(id: string): Promise<number> {
    return await StorageArea.destroy({
      where: { id }
    });
  }

  async countByHouseholdId(householdId: string): Promise<number> {
    return await StorageArea.count({
      where: { householdId }
    });
  }

  async exists(id: string, householdId: string): Promise<boolean> {
    const storageArea = await StorageArea.findOne({
      where: { id, householdId }
    });
    return !!storageArea;
  }
} 