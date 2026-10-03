/** A usable calibration number: finite and not negative. */
export const isCalibrationNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
