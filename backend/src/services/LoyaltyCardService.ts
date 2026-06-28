import { LoyaltyCardRepository } from '../repositories/LoyaltyCardRepository';
import { LoyaltyCard } from '../models/LoyaltyCard';
import { CreateLoyaltyCardDto, UpdateLoyaltyCardDto, LoyaltyCardDto, GetLoyaltyCardsQueryDto } from '../types/LoyaltyCardDto';
import { BrandService } from './BrandService';

export class LoyaltyCardService {
  private loyaltyCardRepository: LoyaltyCardRepository;
  private brandService: BrandService;

  constructor() {
    this.loyaltyCardRepository = new LoyaltyCardRepository();
    this.brandService = new BrandService();
  }

  async createLoyaltyCard(data: CreateLoyaltyCardDto): Promise<LoyaltyCardDto> {
    const loyaltyCard = await this.loyaltyCardRepository.create(data);

    // Track distinct-household usage of the referenced brand. Best-effort:
    // increment only when this household had no prior card for this brand.
    if (data.storeSlug) {
      const priorCount = await this.loyaltyCardRepository.countByHouseholdAndSlug(
        data.householdId,
        data.storeSlug
      );
      if (priorCount <= 1) {
        try {
          await this.brandService.incrementUsage(data.storeSlug);
        } catch (err) {
          console.warn(`Failed to increment usage for brand ${data.storeSlug}:`, err);
        }
      }
    }

    const retrieved = await this.loyaltyCardRepository.findById(loyaltyCard.id, data.householdId);
    if (!retrieved) {
      throw new Error('Failed to retrieve created loyalty card');
    }
    return this.mapToDto(retrieved);
  }

  async getLoyaltyCardById(id: string, householdId: string): Promise<LoyaltyCardDto | null> {
    const loyaltyCard = await this.loyaltyCardRepository.findById(id, householdId);
    return loyaltyCard ? this.mapToDto(loyaltyCard) : null;
  }

  async getLoyaltyCards(query: GetLoyaltyCardsQueryDto): Promise<{ loyaltyCards: LoyaltyCardDto[]; total: number }> {
    const result = await this.loyaltyCardRepository.findAll(query);
    return {
      loyaltyCards: result.loyaltyCards.map(lc => this.mapToDto(lc)),
      total: result.total,
    };
  }

  async getLoyaltyCardsByHousehold(householdId: string): Promise<LoyaltyCardDto[]> {
    const loyaltyCards = await this.loyaltyCardRepository.findByHouseholdId(householdId);
    return loyaltyCards.map(lc => this.mapToDto(lc));
  }

  async updateLoyaltyCard(id: string, householdId: string, data: UpdateLoyaltyCardDto): Promise<LoyaltyCardDto | null> {
    const loyaltyCard = await this.loyaltyCardRepository.update(id, householdId, data);
    return loyaltyCard ? this.mapToDto(loyaltyCard) : null;
  }

  async deleteLoyaltyCard(id: string, householdId: string): Promise<boolean> {
    return await this.loyaltyCardRepository.delete(id, householdId);
  }

  private mapToDto(loyaltyCard: LoyaltyCard): LoyaltyCardDto {
    return {
      id: loyaltyCard.id,
      householdId: loyaltyCard.householdId,
      storeSlug: loyaltyCard.storeSlug,
      storeName: loyaltyCard.storeName,
      cardNumber: loyaltyCard.cardNumber,
      barcodeData: loyaltyCard.barcodeData,
      barcodeFormat: loyaltyCard.barcodeFormat,
      notes: loyaltyCard.notes,
      color: loyaltyCard.color,
      createdBy: loyaltyCard.createdBy,
      createdAt: loyaltyCard.createdAt.toISOString(),
      updatedAt: loyaltyCard.updatedAt.toISOString(),
      creator: loyaltyCard.creator ? {
        id: loyaltyCard.creator.id,
        email: loyaltyCard.creator.email,
      } : undefined,
      household: loyaltyCard.household ? {
        id: loyaltyCard.household.id,
        name: loyaltyCard.household.name,
      } : undefined,
    };
  }
}
