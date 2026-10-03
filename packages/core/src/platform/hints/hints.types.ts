/** Navigator fields that are not in every browser (or in the DOM typings). */
export interface NavigatorHints {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  globalPrivacyControl?: boolean;
  connection?: { saveData?: boolean; effectiveType?: string };
}
