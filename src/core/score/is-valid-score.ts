/** A usable score: finite and not negative. */
export const isValidScore = (value: number): boolean => Number.isFinite(value) && value >= 0;
