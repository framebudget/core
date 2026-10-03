import { runBenchmarkAsync, type BenchResult } from "./bench";
import {
  calibrationKey,
  defaultCalibration,
  mergeCalibration,
  type Calibration,
  type CalibrationPatch,
  type EffectDefinition,
} from "./calibration";
import { decide, type Decision, type OffReason } from "./decide";
import { clock, getScope, safe, type PressureState, type Scope, type ScoreSource } from "./env";
import { isValidScore, writeForcedTier, writeSimulatedScore } from "./force";
import { createGovernor, defaultGovernorOptions, type Governor, type GovernorOptions } from "./governor";
import { readHints, REDUCED_MOTION_QUERY, type Hints } from "./hints";
import { learnedBlocks, recordCleanVisit, recordStutter } from "./learning";
import {
  applyToDocument,
  benchOptions,
  cachedScore,
  COLD_MS,
  initialScore,
  loadContext,
  type StartContext,
} from "./start";
import { saveState } from "./storage";
import { buildReport, refreshCalibration, sendReport, sharingAllowed, type ShareOptions } from "./telemetry";
import { Tier } from "./tiers";

export interface ConfigureOptions {
  /** Overrides part of the calibration (reference rates, thresholds, tiers, hysteresis). */
  calibration?: CalibrationPatch;
  /** Opt-in anonymous sharing. Off by default; `null` turns it off again. */
  share?: ShareOptions | null;
  /** Governor tuning. `auto: false` stops framebudget from sampling main-thread frames itself. */
  governor?: Partial<GovernorOptions> & { auto?: boolean };
  /** `false` ignores the `?framebudget` diagnostics panel parameter. */
  panel?: boolean;
}

export type ChangeReason = "warm" | "governor" | "pressure" | "motion" | "force" | "simulate" | "configure";

export interface BudgetSnapshot {
  tier: Tier;
  /** Effects allowed to run. */
  effects: string[];
  /** Score after pressure and hardware caps; null outside a browser. */
  score: number | null;
  /** Score before pressure and caps: the simulated one while simulating, else the measured one. */
  rawScore: number | null;
  source: ScoreSource | null;
  /** Debug and demo: the simulated score, or null on the real device. */
  simulated: number | null;
  cold: BenchResult | null;
  warm: BenchResult | null;
  hints: Hints | null;
  pressure: PressureState | undefined;
  forced: Tier | null;
  off: Record<string, OffReason>;
  /** Effects the governor stepped down on this page. */
  stepped: string[];
  /** Effects kept off because they stuttered on earlier visits. */
  learned: string[];
  /** Median frames per second per reported source. */
  fps: Record<string, number>;
  calibration: Calibration;
}

export type ChangeListener = (snapshot: BudgetSnapshot, reason: ChangeReason) => void;

export interface Budget {
  /** May this effect run on this device? Unknown effects and server rendering answer false. */
  allows(effect: string): boolean;
  readonly tier: Tier;
  readonly score: number | null;
  effects(): string[];
  snapshot(): BudgetSnapshot;
  /** Subscribes to budget changes. Returns the unsubscribe function. */
  on(type: "change", listener: ChangeListener): () => void;
  off(type: "change", listener: ChangeListener): void;
  /**
   * Reports the time between two frames. `source` is "main" (default),
   * "worker", or an effect name; strikes on an effect's own frames step that
   * effect down, strikes elsewhere step the most expensive effect down.
   */
  reportFrame(gapMs: number, source?: string): void;
  configure(options: ConfigureOptions): void;
  /** Adds an effect to the registry, or replaces an existing definition. */
  register(name: string, effect: EffectDefinition): void;
  /** Forces a tier for the session, or returns to automatic decisions with "auto". */
  force(tier: Tier | "auto"): void;
  /**
   * Debug and demo API. Simulates a device with this benchmark score for the
   * session (null returns to the real device). The score goes through the
   * normal thresholds, hysteresis, caps, preferences and governor, and always
   * emits "change" with reason "simulate". Nothing learned or measured while
   * simulating is stored, and no telemetry is sent.
   */
  simulate(score: number | null): void;
}

export interface CreateBudgetOptions {
  /** Browser globals; defaults to `window`. `null` behaves like server rendering. */
  scope?: Scope | null;
  /** Sampling source for telemetry. */
  random?: () => number;
  /** Yields between warm benchmark rounds. Defaults to a zero timeout. */
  pause?: () => Promise<unknown>;
}

const WARM_MS = 24;
const ACTIVE_MS = 3000;
const INITIAL_SAMPLING_MS = 10000;
const WAKE_EVENTS = ["scroll", "wheel", "pointerdown", "pointermove", "touchstart", "keydown"];
const PANEL_PARAM = /(?:^|[?&])framebudget(?:[=&#]|$)/;

export function createBudget(init: CreateBudgetOptions = {}): Budget {
  const listeners = new Set<ChangeListener>();
  const patches: CalibrationPatch[] = [];
  const config: ConfigureOptions = {};
  let started = false;
  let scope: Scope | undefined;
  let ctx: StartContext | null = null;
  let remote: CalibrationPatch | undefined;
  let decision: Decision | null = null;
  let score: number | null = null;
  let source: ScoreSource | null = null;
  let cold: BenchResult | null = null;
  let warm: BenchResult | null = null;
  let pressure: PressureState | undefined;
  let learned: string[] = [];
  const stepped: string[] = [];
  let governor: Governor | null = null;
  let loaded = false;
  let sharingArmed = false;
  let reported = false;
  let now: () => number = () => Date.now();

  function emit(reason: ChangeReason): void {
    if (listeners.size === 0) return;
    const snap = api.snapshot();
    for (const listener of Array.from(listeners)) {
      try {
        listener(snap, reason);
      } catch (error) {
        // Surface the error without breaking the other listeners or the governor.
        void Promise.reject(error);
      }
    }
  }

  function persist(): void {
    if (ctx) saveState(ctx.storage, ctx.stored);
  }

  function recompute(reason: ChangeReason, always = false): void {
    if (!ctx || !scope || score === null) return;
    const prev = decision;
    decision = decide({
      cal: ctx.cal,
      score: ctx.simulated !== null ? ctx.simulated : score,
      hints: ctx.hints,
      pressure,
      prev: prev ? prev.qualified : ctx.stored.qualified,
      learned: ctx.simulated !== null ? [] : learned, // a simulated device has no history
      stepped,
      forced: ctx.forced,
    });
    applyToDocument(scope, decision.tier, decision.effects);
    if (!ctx.forced && ctx.simulated === null) {
      ctx.stored.qualified = decision.qualified;
      persist();
    }
    if (always || (prev && (prev.tier !== decision.tier || prev.effects.join() !== decision.effects.join()))) emit(reason);
  }

  function recalibrate(): void {
    if (!ctx) return;
    ctx.cal = mergeCalibration(defaultCalibration, remote, ...patches);
    learned = learnedBlocks(ctx.stored, ctx.cal);
  }

  function strikeOut(frameSource: string): boolean {
    if (!ctx || !decision || ctx.forced) return false;
    const cal = ctx.cal;
    const allowed = decision.effects;
    const victim = allowed.includes(frameSource)
      ? frameSource
      : allowed
          .slice()
          .sort((a, b) => cal.effects[b]!.cost - cal.effects[a]!.cost || cal.effects[b]!.threshold - cal.effects[a]!.threshold)[0];
    if (!victim) return false;
    stepped.push(victim);
    if (ctx.simulated === null) recordStutter(ctx.stored, victim); // recompute persists it
    recompute("governor");
    return true;
  }

  function cleanVisit(): void {
    if (!ctx || !decision || ctx.forced || ctx.simulated !== null) return;
    recordCleanVisit(ctx.stored, decision.effects);
    persist();
  }

  function startGovernor(s: Scope): void {
    const { auto, ...tuning } = config.governor || {};
    const options: GovernorOptions = { ...defaultGovernorOptions, ...tuning };
    governor = createGovernor(options, now, { strikeOut, clean: cleanVisit });
    if (auto === false) return;
    const raf = safe(() => s.requestAnimationFrame && s.requestAnimationFrame.bind(s));
    if (!raf) return;
    // Main-thread frames are sampled while the page is busy (start, interaction), not forever.
    let last = 0;
    let until = 0;
    let running = false;
    const frame = (t: number): void => {
      if (safe(() => s.document && s.document.visibilityState) === "hidden") last = 0;
      else {
        if (last && governor) governor.report(t - last, "main");
        last = t;
      }
      if (now() < until) raf(frame);
      else {
        running = false;
        last = 0;
      }
    };
    const wake = (ms: number): void => {
      until = Math.max(until, now() + ms);
      if (!running) {
        running = true;
        raf(frame);
      }
    };
    const onActivity = (): void => wake(ACTIVE_MS);
    for (const type of WAKE_EVENTS) safe(() => s.addEventListener!(type, onActivity, { passive: true, capture: true }));
    wake(options.warmupMs + INITIAL_SAMPLING_MS);
  }

  function flushReport(): void {
    if (reported || !scope || !ctx || !decision || score === null) return;
    const hints = readHints(scope); // GPC or Save-Data may have changed since load.
    const share = config.share || undefined;
    if (!sharingAllowed(share, hints) || ctx.forced || ctx.simulated !== null) return;
    reported = sendReport(
      scope,
      share,
      buildReport({
        cal: ctx.cal,
        score: decision.score,
        cold,
        warm,
        hints,
        pressure,
        tier: decision.tier,
        effects: decision.effects,
        stepped,
        fps: governor ? governor.fps() : {},
      }),
    );
  }

  function startSharing(): void {
    if (!scope || !ctx || !loaded) return;
    const share = config.share || undefined;
    if (!sharingAllowed(share, ctx.hints)) return;
    if (share.calibrationUrl) refreshCalibration(scope, share.calibrationUrl, ctx.stored, ctx.storage, Date.now());
    if (sharingArmed) return;
    sharingArmed = true;
    const rate = typeof share.sampleRate === "number" ? share.sampleRate : 0.1;
    if (!((init.random || Math.random)() < rate)) return;
    const s = scope;
    safe(() => s.addEventListener!("pagehide", flushReport));
    safe(() =>
      s.document!.addEventListener("visibilitychange", () => {
        if (s.document!.visibilityState === "hidden") flushReport();
      }),
    );
  }

  function onLoad(): void {
    const s = scope;
    if (loaded || !s || !ctx) return;
    loaded = true;
    startGovernor(s);
    const pause =
      init.pause || (() => new Promise<void>((resolve) => (s.setTimeout ? s.setTimeout(resolve, 0) : resolve())));
    const c = ctx;
    runBenchmarkAsync(benchOptions(s, c.cal, WARM_MS, true), pause)
      .then((result) => {
        if (result) {
          warm = result;
          if (c.simulated === null) {
            const previous = cachedScore(c, Date.now());
            c.stored.score = previous !== undefined ? (previous + result.score) / 2 : result.score;
            c.stored.key = calibrationKey(c.cal);
            c.stored.at = Date.now();
            persist();
          }
          score = result.score;
          source = "warm";
          recompute("warm");
        }
      })
      .catch(() => undefined)
      .then(startSharing);
    if (config.panel !== false && PANEL_PARAM.test(safe(() => s.location!.search) || "")) {
      import("./panel").then((m) => m.mountPanel(api)).catch(() => undefined);
    }
  }

  function start(): void {
    if (started) return;
    started = true;
    scope = init.scope === undefined ? getScope() : init.scope || undefined;
    const s = scope;
    if (!s) return;
    now = clock(s);
    const c = loadContext(s, patches);
    ctx = c;
    remote = c.stored.remote;
    learned = learnedBlocks(c.stored, c.cal);

    const boot = safe(() => s.__framebudget);
    let prev = c.stored.qualified;
    if (boot && boot.v === 1 && typeof boot.score === "number") {
      score = boot.score;
      source = boot.source;
      cold = boot.cold;
      prev = boot.qualified;
    } else {
      const first = initialScore(s, c, COLD_MS);
      score = first.score;
      source = first.source;
      cold = first.cold;
    }
    const input = c.simulated !== null ? c.simulated : score;
    decision = decide({ cal: c.cal, score: input, hints: c.hints, prev, learned: c.simulated !== null ? [] : learned, forced: c.forced });
    applyToDocument(s, decision.tier, decision.effects);

    safe(() => {
      const mql = s.matchMedia!(REDUCED_MOTION_QUERY);
      const onMotion = (): void => {
        c.hints = readHints(s);
        recompute("motion");
      };
      if (mql.addEventListener) mql.addEventListener("change", onMotion);
      else mql.addListener(onMotion);
    });

    safe(() => {
      const Observer = s.PressureObserver;
      if (!Observer) return;
      const observer = new Observer((records) => {
        const last = records[records.length - 1];
        if (last && last.state !== pressure) {
          pressure = last.state;
          recompute("pressure");
        }
      });
      Promise.resolve(observer.observe("cpu")).catch(() => undefined);
    });

    const doc = safe(() => s.document);
    if (doc && doc.readyState === "complete") {
      if (s.setTimeout) s.setTimeout(onLoad, 0);
      else onLoad();
    } else safe(() => s.addEventListener!("load", onLoad, { once: true }));
  }

  const api: Budget = {
    allows(effect) {
      start();
      return !!decision && decision.effects.includes(effect);
    },
    get tier() {
      start();
      return decision ? decision.tier : Tier.Lite;
    },
    get score() {
      start();
      return decision ? decision.score : null;
    },
    effects() {
      start();
      return decision ? decision.effects.slice() : [];
    },
    snapshot() {
      start();
      return {
        tier: decision ? decision.tier : Tier.Lite,
        effects: decision ? decision.effects.slice() : [],
        score: decision ? decision.score : null,
        rawScore: ctx && ctx.simulated !== null ? ctx.simulated : score,
        source: ctx && ctx.simulated !== null ? "simulated" : source,
        simulated: ctx ? ctx.simulated : null,
        cold,
        warm,
        hints: ctx ? { ...ctx.hints } : null,
        pressure,
        forced: ctx ? ctx.forced : null,
        off: decision ? { ...decision.off } : {},
        stepped: stepped.slice(),
        learned: learned.slice(),
        fps: governor ? governor.fps() : {},
        calibration: ctx ? ctx.cal : mergeCalibration(defaultCalibration, ...patches),
      };
    },
    on(_type, listener) {
      start();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    off(_type, listener) {
      listeners.delete(listener);
    },
    reportFrame(gapMs, frameSource) {
      start();
      if (governor) governor.report(gapMs, frameSource);
    },
    configure(options) {
      if (options.calibration) patches.push(options.calibration);
      if (options.share !== undefined) config.share = options.share;
      if (options.governor) config.governor = { ...config.governor, ...options.governor };
      if (options.panel !== undefined) config.panel = options.panel;
      start();
      if (options.calibration) {
        recalibrate();
        recompute("configure");
      }
      if (options.share) startSharing();
    },
    register(name, effect) {
      patches.push({ effects: { [name]: effect } });
      start();
      recalibrate();
      recompute("configure");
    },
    force(tier) {
      start();
      if (!scope || !ctx) return;
      writeForcedTier(scope, tier);
      ctx.forced = tier === "auto" ? null : tier;
      recompute("force");
    },
    simulate(value) {
      if (value !== null && !(typeof value === "number" && isValidScore(value))) {
        throw new RangeError("framebudget: simulate() takes a score of 0 or more, or null");
      }
      start();
      if (!scope || !ctx) return;
      writeSimulatedScore(scope, value);
      ctx.simulated = value;
      stepped.length = 0; // each simulated device starts fresh
      recompute("simulate", true);
    },
  };
  return api;
}
