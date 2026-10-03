/**
 * Source of the inline boot script. scripts/build-boot.mjs bundles it into a
 * self-contained, minified IIFE; createBootScript() replaces the placeholder
 * with the site's options. It decides before the first paint and never throws.
 */
import { decide } from "../core/decision/decide";
import { learnedBlocks } from "../core/learning/learned-blocks";
import { applyToDocument } from "../platform/document/apply-to-document";
import { getScope } from "../platform/scope/get-scope";
import { initialScore } from "../startup/initial-score";
import { loadContext } from "../startup/load-context";
import { COLD_MS } from "../startup/startup.constants";
import type { BootOptions } from "./boot.types";

// Typed with `false` so a missing or falsy value still falls back to the defaults.
declare const __FRAMEBUDGET_OPTIONS__: false | BootOptions;

const scope = getScope();
if (scope) {
  try {
    const { calibration: calibrationPatch, coldMs = 0 } = __FRAMEBUDGET_OPTIONS__ || {};
    const context = loadContext(scope, [calibrationPatch]);
    const { simulated, stored } = context;
    // `|| COLD_MS` on a number: a zero or NaN budget also means the default.
    const first = initialScore(scope, context, coldMs || COLD_MS);
    const decision = decide({
      calibration: context.calibration,
      score: simulated ?? first.score,
      hints: context.hints,
      previous: stored.qualified,
      learned: simulated === null ? learnedBlocks(stored, context.calibration) : [],
      forced: context.forced,
    });
    applyToDocument(scope, decision.tier, decision.effects);
    scope.__framebudget = {
      v: 1,
      score: first.score,
      source: first.source,
      cold: first.cold,
      tier: decision.tier,
      effects: decision.effects,
      qualified: decision.qualified,
      forced: context.forced,
    };
  } catch {
    // Never break the page. Without attributes, CSS keeps effects off and the core decides later.
  }
}
