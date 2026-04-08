import { LoyaltyCard } from '../models/LoyaltyCard';
import { User } from '../models/User';
import { Household } from '../models/Household';
import { CreateLoyaltyCardDto, UpdateLoyaltyCardDto, GetLoyaltyCardsQueryDto } from '../types/LoyaltyCardDto';

export class LoyaltyCardRepository {
  async create(data: CreateLoyaltyCardDto): Promise<LoyaltyCard> {
    return await LoyaltyCard.create({
      householdId: data.householdId,
      storeSlug: data.storeSlug || null,
      storeName: data.storeName,
      cardNumber: data.cardNumber,
      barcodeData: data.barcodeData || null,
      barcodeFormat: data.barcodeFormat || null,
      notes: data.notes || null,
      color: data.color || null,
      createdBy: data.createdBy,
    });
  }

  async findById(id: string, householdId: string): Promise<LoyaltyCard | null> {
    return await LoyaltyCard.findOne({
      where: { id, householdId },
      include: [
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

  async findAll(query: GetLoyaltyCardsQueryDto): Promise<{ loyaltyCards: LoyaltyCard[]; total: number }> {
    const { count, rows } = await LoyaltyCard.findAndCountAll({
      where: { householdId: query.householdId },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email'],
        },
      ],
      limit: query.limit,
      offset: query.offset,
      order: [['storeName', 'ASC']],
    });

    return {
      loyaltyCards: rows,
      total: count,
    };
  }

  async findByHouseholdId(householdId: string): Promise<LoyaltyCard[]> {
    return await LoyaltyCard.findAll({
      where: { householdId },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email'],
        },
      ],
      order: [['storeName', 'ASC']],
    });
  }

  async update(id: string, householdId: string, data: UpdateLoyaltyCardDto): Promise<LoyaltyCard | null> {
    const loyaltyCard = await LoyaltyCard.findOne({
      where: { id, householdId },
    });

    if (!loyaltyCard) {
      return null;
    }

    await loyaltyCard.update(data);
    return await this.findById(id, householdId);
  }

  async delete(id: string, householdId: string): Promise<boolean> {
    const deleted = await LoyaltyCard.destroy({
      where: { id, householdId },
    });
    return deleted > 0;
  }
}
