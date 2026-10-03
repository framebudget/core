import type { Budget } from "../../src/budget/budget.types";
import type { Scope } from "../../src/platform/scope/scope.types";

export interface FakeStorage {
  data: Map<string, string>;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface FakeBrowserOptions {
  search?: string;
  gpc?: boolean;
  saveData?: boolean;
  reducedMotion?: boolean;
  deviceMemory?: number;
  local?: FakeStorage;
  session?: FakeStorage;
  fetch?: (url: string, init?: RequestInit) => Promise<unknown>;
}

export type ListenerMap = Record<string, (() => void)[]>;

export interface Beacon {
  url: string;
  body: string;
}

export interface FakeNavigator {
  hardwareConcurrency: number;
  deviceMemory: number;
  globalPrivacyControl: boolean;
  connection: { saveData: boolean; effectiveType: string };
  sendBeacon(url: string, body: string): boolean;
}

export interface FakeDocument {
  readyState: string;
  visibilityState: string;
  documentElement: { setAttribute(name: string, value: string): void };
  addEventListener(type: string, listener: () => void): void;
}

export interface FakeBrowser {
  scope: Scope;
  /** Attributes set on the document root. */
  attributes: Record<string, string>;
  navigator: FakeNavigator;
  document: FakeDocument;
  beacons: Beacon[];
  local: FakeStorage;
  session: FakeStorage;
  clock: { t: number };
  /** Runs pending timers, then lets promise chains (warm benchmark, fetch) settle. */
  settle(): Promise<void>;
  fire(type: string): void;
}

export interface BootedPage {
  browser: FakeBrowser;
  budget: Budget;
  local: FakeStorage;
  session: FakeStorage;
}
