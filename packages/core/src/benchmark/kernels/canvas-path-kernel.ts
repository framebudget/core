import type { Kernel } from "../benchmark.types";

/** Builds and hit-tests a small canvas path. */
export function createCanvasPathKernel(context: OffscreenCanvasRenderingContext2D): Kernel {
  return {
    name: "path",
    batch: 2,
    run(units) {
      for (let index = 0; index < units; index++) {
        context.beginPath();
        context.moveTo(index & 15, 0);
        context.lineTo(16, index & 7);
        context.quadraticCurveTo(8, 16, 0, 8);
        context.closePath();
      }
      return context.isPointInPath(8, 8) ? 1 : 0;
    },
  };
}
