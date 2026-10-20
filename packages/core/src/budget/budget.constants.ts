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
/** Effects stepped down on a guess before the governor concludes the stutter is not theirs. */
export const MAX_GUESSES = 3;
/** Frames kept for the governor before load: about 16 s at 60 fps, more than any load should take. */
export const MAX_PENDING_FRAMES = 1000;
