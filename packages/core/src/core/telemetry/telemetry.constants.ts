/** Days a browser waits after a report before it reports again, when the site sets no interval. */
export const DEFAULT_REPORT_INTERVAL_DAYS = 7;
export const DAY_MS = 86_400_000;
/** Every shared report goes here, whatever the site configures. */
export const SHARE_REPORT_URL = "https://framebudget.dev/api/report";
/** Calibration fetched while sharing, unless the site sets `calibrationUrl`. */
export const SHARE_CALIBRATION_URL = "https://framebudget.dev/api/calibration";
