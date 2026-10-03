import type { Beacon, FakeBrowserOptions, FakeDocument, FakeNavigator, ListenerMap } from "./fake-browser.types";

/** A navigator with fixed hardware hints whose sendBeacon records every report. */
export function fakeNavigator(options: FakeBrowserOptions, beacons: Beacon[]): FakeNavigator {
  return {
    hardwareConcurrency: 8,
    deviceMemory: options.deviceMemory ?? 8,
    globalPrivacyControl: options.gpc ?? false,
    connection: { saveData: options.saveData ?? false, effectiveType: "4g" },
    sendBeacon(url, body) {
      beacons.push({ url, body });
      return true;
    },
  };
}

/** A loaded, visible document whose root records attributes; listeners are kept under `document:<type>`. */
export function fakeDocument(attributes: Record<string, string>, listeners: ListenerMap): FakeDocument {
  return {
    readyState: "complete",
    visibilityState: "visible",
    documentElement: {
      setAttribute(name, value) {
        attributes[name] = value;
      },
    },
    addEventListener(type, listener) {
      (listeners["document:" + type] ??= []).push(listener);
    },
  };
}
