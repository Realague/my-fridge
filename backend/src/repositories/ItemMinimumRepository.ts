import { ItemMinimum } from '../models/ItemMinimum';
import { Item } from '../models/Item';
import { User } from '../models/User';
import { Household } from '../models/Household';
import { CreateItemMinimumDto, UpdateItemMinimumDto, GetItemMinimumsQueryDto } from '../types/ItemMinimumDto';

export class ItemMinimumRepository {
  async create(data: CreateItemMinimumDto): Promise<ItemMinimum> {
    return await ItemMinimum.create({
      itemId: data.itemId,
      householdId: data.householdId,
      minimumQuantity: data.minimumQuantity,
      minimumUnit: data.minimumUnit,
      createdBy: data.createdBy,
    });
  }

  async findById(id: string, householdId: string): Promise<ItemMinimum | null> {
    return await ItemMinimum.findOne({
      where: { id, householdId },
      include: [
        {
          model: Item,
          as: 'item',
          include: [
            { model: User, as: 'creator', attributes: ['id', 'email'] },
            { model: Household, as: 'household', attributes: ['id', 'name'] },
          ],
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email'],
        },
        {
          model: Household,
          as: 'household',
          attributes: ['id', 'name'],
        },
      ],
    });
  }

  async findAll(query: GetItemMinimumsQueryDto): Promise<{ itemMinimums: ItemMinimum[]; total: number }> {
    const where: any = {
      householdId: query.householdId,
    };

    if (query.itemId) {
      where.itemId = query.itemId;
    }

    const { count, rows } = await ItemMinimum.findAndCountAll({
      where,
      include: [
        {
          model: Item,
          as: 'item',
          include: [
            { model: User, as: 'creator', attributes: ['id', 'email'] },
            { model: Household, as: 'household', attributes: ['id', 'name'] },
          ],
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email'],
        },
      ],
      limit: query.limit,
      offset: query.offset,
      order: [['createdAt', 'DESC']],
    });

    return {
      itemMinimums: rows,
      total: count,
    };
  }

  async findByHouseholdId(householdId: string): Promise<ItemMinimum[]> {
    return await ItemMinimum.findAll({
      where: { householdId },
      include: [
        {
          model: Item,
          as: 'item',
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async findByItemAndHousehold(itemId: string, householdId: string): Promise<ItemMinimum | null> {
    return await ItemMinimum.findOne({
      where: { itemId, householdId },
      include: [
        {
          model: Item,
          as: 'item',
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email'],
        },
      ],
    });
  }

  async update(id: string, householdId: string, data: UpdateItemMinimumDto): Promise<ItemMinimum | null> {
    const itemMinimum = await ItemMinimum.findOne({
      where: { id, householdId },
    });

    if (!itemMinimum) {
      return null;
    }

    await itemMinimum.update(data);
    return await this.findById(id, householdId);
  }

  async delete(id: string, householdId: string): Promise<boolean> {
    const deleted = await ItemMinimum.destroy({
      where: { id, householdId },
    });
    return deleted > 0;
  }

  async checkDuplicate(itemId: string, householdId: string, unit: string, excludeId?: string): Promise<boolean> {
    const where: any = { itemId, householdId, minimumUnit: unit };
    
    if (excludeId) {
      where.id = { [require('sequelize').Op.ne]: excludeId };
    }

    const existing = await ItemMinimum.findOne({ where });
    return !!existing;
  }
}
