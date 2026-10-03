/**
 * Source of the inline boot script. scripts/build-boot.mjs bundles it into a
 * self-contained, minified IIFE; createBootScript() replaces the placeholder
 * with the site's options. It decides before the first paint and never throws.
 */
import type { BootOptions } from "../boot";
import { decide } from "../decide";
import { getScope } from "../env";
import { learnedBlocks } from "../learning";
import { applyToDocument, COLD_MS, initialScore, loadContext } from "../start";

declare const __FRAMEBUDGET_OPTIONS__: BootOptions;

const scope = getScope();
if (scope) {
  try {
    const options = __FRAMEBUDGET_OPTIONS__ || {};
    const ctx = loadContext(scope, [options.calibration]);
    const first = initialScore(scope, ctx, options.coldMs || COLD_MS);
    const d = decide({
      cal: ctx.cal,
      score: ctx.simulated !== null ? ctx.simulated : first.score,
      hints: ctx.hints,
      prev: ctx.stored.qualified,
      learned: ctx.simulated !== null ? [] : learnedBlocks(ctx.stored, ctx.cal),
      forced: ctx.forced,
    });
    applyToDocument(scope, d.tier, d.effects);
    scope.__framebudget = {
      v: 1,
      score: first.score,
      source: first.source,
      cold: first.cold,
      tier: d.tier,
      effects: d.effects,
      qualified: d.qualified,
      forced: ctx.forced,
    };
  } catch {
    // Never break the page. Without attributes, CSS keeps effects off and the core decides later.
  }
}
