/** Slice budget of the warm benchmark that runs after load. */
export const WARM_MS = 24;
/** Main-thread frames are sampled this long after each interaction. */
export const ACTIVE_MS = 3000;
/** Main-thread frames are sampled this long after the governor warm-up. */
export const INITIAL_SAMPLING_MS = 10_000;
/** Interactions that resume main-thread frame sampling. */
export const WAKE_EVENTS = ["scroll", "wheel", "pointerdown", "pointermove", "touchstart", "keydown"];
export const PANEL_PARAM = /(?:^|[?&])framebudget(?:[=&#]|$)/;
/** Fraction of page views that report when the site sets no sample rate. */
export const DEFAULT_SAMPLE_RATE = 0.1;
