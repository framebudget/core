const SPIN_LIMIT = 200_000;

/** Spins until the clock moves past `from`. Returns NaN when it never does. */
export function nextTick(now: () => number, from: number): number {
  for (let spin = 0; spin < SPIN_LIMIT; spin++) {
    const time = now();
    if (time > from) return time;
  }
  return NaN;
}
