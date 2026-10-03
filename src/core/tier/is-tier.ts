import type { Tier } from "./tier.enum";
import { TIERS } from "./tier-order";

export function isTier(value: unknown): value is Tier {
  return typeof value === "string" && (TIERS as readonly string[]).includes(value);
}
