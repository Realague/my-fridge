type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * Catalog items (householdId === null) are translated through the `items.*`
 * namespace; household-created items keep their user-typed name as-is.
 */
export const translateItemName = (
  name: string,
  itemHouseholdId: string | null,
  t: Translate
): string => {
  if (itemHouseholdId !== null && itemHouseholdId !== undefined) return name;
  const key = `items.${name}`;
  const translated = t(key);
  return translated && translated !== key ? translated : name;
};

/** Whole numbers stay bare; fractions are trimmed of trailing zeros. */
export const formatQuantity = (quantity: number): string => {
  if (Number.isInteger(quantity)) return quantity.toString();
  return quantity.toFixed(2).replace(/\.?0+$/, '');
};

export const daysSince = (isoDate: string): number => {
  const opened = new Date(isoDate);
  const now = new Date();
  const start = new Date(opened.getFullYear(), opened.getMonth(), opened.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000));
};
