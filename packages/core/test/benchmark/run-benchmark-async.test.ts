import { describe, expect, it } from "vitest";
import { runBenchmarkAsync } from "../../src/benchmark/run-benchmark-async";
import { device, expectNear, options } from "./fake-device";

describe("runBenchmarkAsync", () => {
  it("yields between rounds and measures the same as the sync run", async () => {
    let pauses = 0;
    const fake = device({ typed: 4 });
    const result = (await runBenchmarkAsync(options(fake), () => {
      pauses += 1;
      return Promise.resolve();
    }))!;
    expect(pauses).toBe(4); // warm-up + 4 rounds = 5 rounds, 4 gaps
    expectNear(result.score, 100 * Math.pow(4, 0.25));
  });
});
