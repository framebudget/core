import { Tier } from "../core/tier/tier.enum";
import type { Budget, CreateBudgetOptions } from "./budget.types";
import { buildSnapshot } from "./build-snapshot";
import { configureBudget, registerEffect } from "./configure-budget";
import { createBudgetState } from "./create-budget-state";
import { assertSimulatedScore, forceTier, simulateScore } from "./session-overrides";
import { startBudget } from "./start-budget";

export function createBudget(init: CreateBudgetOptions = {}): Budget {
  const state = createBudgetState(init);
  const start = (): void => {
    startBudget(state, budget);
  };
  const budget: Budget = {
    allows(effect) {
      start();
      return !!state.decision && state.decision.effects.includes(effect);
    },
    get tier() {
      start();
      return state.decision ? state.decision.tier : Tier.Lite;
    },
    get score() {
      start();
      return state.decision ? state.decision.score : null;
    },
    effects() {
      start();
      return state.decision ? [...state.decision.effects] : [];
    },
    snapshot() {
      start();
      return buildSnapshot(state);
    },
    on(_type, listener) {
      start();
      state.listeners.add(listener);
      return () => state.listeners.delete(listener);
    },
    off(_type, listener) {
      state.listeners.delete(listener);
    },
    reportFrame(gapMs, frameSource) {
      start();
      state.governor?.report(gapMs, frameSource);
    },
    configure(options) {
      configureBudget(state, options, start);
    },
    register(name, effect) {
      registerEffect(state, name, effect, start);
    },
    force(tier) {
      start();
      forceTier(state, tier);
    },
    simulate(value) {
      assertSimulatedScore(value);
      start();
      simulateScore(state, value);
    },
  };
  return budget;
}
