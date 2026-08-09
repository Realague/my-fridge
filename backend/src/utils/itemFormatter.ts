import { Item } from '../models/Item';
import { ItemDto } from '../types/ItemDto';

// Canonical Item → ItemDto mapping. Shared by ItemService and
// ItemSuggestionService so both endpoints return the identical shape the
// frontend already consumes.
export function formatItemDto(item: Item): ItemDto {
  let availableUnits = item.availableUnits;
  if (typeof availableUnits === 'string') {
    try {
      availableUnits = JSON.parse(availableUnits);
    } catch {
      availableUnits = [item.defaultUnit];
    }
  }
  if (!Array.isArray(availableUnits)) {
    availableUnits = [item.defaultUnit];
  }

  return {
    id: item.id,
    name: item.name,
    category: item.category,
    defaultUnit: item.defaultUnit,
    availableUnits: availableUnits,
    pieceAlias: item.pieceAlias ?? null,
    daysAfterOpening: item.daysAfterOpening || undefined,
    createdBy: item.createdBy,
    householdId: item.householdId,
    imageUrl: item.imageUrl,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    creator: item.creator
      ? { id: item.creator.id, displayName: item.creator.firstName + ' ' + item.creator.lastName, email: item.creator.email }
      : undefined,
    household: item.household ? { id: item.household.id, name: item.household.name } : undefined,
  };
}
