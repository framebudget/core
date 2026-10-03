import { describe, expect, it } from "vitest";
import { defaultCalibration } from "../../../src/core/calibration/default-calibration";
import { learnedBlocks } from "../../../src/core/learning/learned-blocks";
import { recordCleanVisit } from "../../../src/core/learning/record-clean-visit";
import { recordStutter } from "../../../src/core/learning/record-stutter";
import type { StoredState } from "../../../src/core/state/stored-state.types";

const calibration = defaultCalibration; // retryVisits: 5

/** Records `count` clean visits that ran none of the blocked effects. */
function cleanVisits(state: StoredState, count: number): StoredState {
  let next = state;
  for (let index = 0; index < count; index++) next = recordCleanVisit(next, []);
  return next;
}

describe("learning state", () => {
  it("blocks a stuttering effect until enough clean visits, doubling the wait after each new stutter", () => {
    const empty: StoredState = { v: 1, blocked: {} };
    let state = recordStutter(empty, "blur");
    expect(empty).toEqual({ v: 1, blocked: {} });
    expect(learnedBlocks(state, calibration)).toEqual(["blur"]);
    state = cleanVisits(state, 4);
    expect(learnedBlocks(state, calibration)).toEqual(["blur"]);
    state = recordCleanVisit(state, []);
    expect(learnedBlocks(state, calibration)).toEqual([]); // fifth clean visit: retry

    state = recordStutter(state, "blur"); // the retry stuttered too
    state = cleanVisits(state, 9);
    expect(learnedBlocks(state, calibration)).toEqual(["blur"]);
    state = recordCleanVisit(state, []);
    expect(learnedBlocks(state, calibration)).toEqual([]);
  });

  it("forgets an effect once a clean visit ran with it", () => {
    const stuttered = recordStutter(recordStutter({ v: 1, blocked: {} }, "blur"), "parallax");
    const state = recordCleanVisit(stuttered, ["blur", "hover"]);
    expect(state.blocked).toEqual({ parallax: { clean: 1, fails: 1 } });
    expect(stuttered.blocked).toEqual({ blur: { clean: 0, fails: 1 }, parallax: { clean: 0, fails: 1 } });
  });
});
