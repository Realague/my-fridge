// Anti-gaspi (anti-waste) rate: consumed / (consumed + wasted). `removed` is a
// neutral exit and is excluded, per the Sorties de stock spec.

export interface AntiGaspi {
  /** Rounded percentage, or null when there are no food exits (no data). */
  rate: number | null;
  /** Consumed share (0–100), for the stacked progress bar width. */
  consumedPct: number;
}

export function computeAntiGaspi(consumed: number, wasted: number): AntiGaspi {
  const foodExits = consumed + wasted;
  if (foodExits === 0) return { rate: null, consumedPct: 0 };
  const consumedPct = (consumed / foodExits) * 100;
  return { rate: Math.round(consumedPct), consumedPct };
}
