import { StructuredIngredient } from '@/components/StructuredIngredientInput';

/**
 * Ingredient shape used inside the recipe editor: same as the structured
 * ingredient input, but with a guaranteed client-side id so the
 * ingredient → step mapping stays stable across edits.
 */
export interface EditorIngredient extends StructuredIngredient {
  id: string;
}

export const newIngredientId = () =>
  `ing-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const emptyIngredient = (): EditorIngredient => ({
  id: newIngredientId(),
  itemId: '',
  quantity: 1,
  unit: 'piece',
  isFreeQuantity: false,
  notes: '',
});
