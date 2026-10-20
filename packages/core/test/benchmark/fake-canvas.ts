import type { Scope } from "../../src/platform/scope/scope.types";

const noop = (): undefined => undefined;

/** A 2D context that draws nothing; `readback` stands in for getImageData. */
function fakeContext(readback: () => Uint8ClampedArray): object {
  return {
    lineWidth: 1,
    strokeStyle: "",
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    quadraticCurveTo: noop,
    bezierCurveTo: noop,
    closePath: noop,
    stroke: noop,
    isPointInPath: () => false,
    getImageData: () => ({ data: readback() }),
  };
}

const pixel = (): Uint8ClampedArray => new Uint8ClampedArray([40, 90, 200, 89]);

// Plain functions, so `new` returns the object they build.
const FakePath2D = function () {
  return { moveTo: noop, bezierCurveTo: noop };
} as unknown as typeof Path2D;

/** A page with OffscreenCanvas. */
export function offscreenScope(readback = pixel): Scope {
  const context = fakeContext(readback);
  const Offscreen = function () {
    return { getContext: () => context };
  } as unknown as typeof OffscreenCanvas;
  return { OffscreenCanvas: Offscreen, Path2D: FakePath2D } as Scope;
}

/** A page without OffscreenCanvas, where only a canvas element can draw. */
export function elementScope(): Scope {
  const canvas = { width: 300, height: 150, getContext: () => fakeContext(pixel) };
  return { document: { createElement: () => canvas }, Path2D: FakePath2D } as unknown as Scope;
}
