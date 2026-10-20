import type { Kernel, RasterContext } from "../benchmark.types";

/**
 * Canvas side in pixels. At 64 px a thread is about 90 px of curve, so each
 * stroke rasterizes real anti-aliased coverage, while one call stays short:
 * on a desktop Chrome a stroke costs about 5 µs and the flush with the
 * readback about 3 µs, so the initial batch of 4 takes about 24 µs there
 * and a few times that on a phone, many calls per 0.75 ms warm slice. The
 * strokes, not the readback, dominate the time.
 */
export const RASTER_SIZE = 64;

/**
 * Anti-aliased rasterization: thin translucent cubic curves stroked across the
 * canvas, like the threads of an SVG ribbon. A unit is one stroke. Canvases
 * record draw calls and paint them later, so each call ends with a 1-pixel
 * readback that forces its strokes to be drawn before the clock is read.
 * Every curve passes through the pixel read, so the result depends on all of
 * them. It measures rasterization as the 2D canvas exposes it (on the GPU or
 * the CPU, whichever the browser picked, and a browser may move a canvas that
 * is read back often to the CPU), plus the flush and the readback. It does not
 * measure SVG layout, layer compositing or the browser's own paint scheduling.
 */
export function createRasterKernel(context: RasterContext, newPath: () => Path2D): Kernel {
  let phase = 0;
  context.lineWidth = 1.25;
  context.strokeStyle = "rgba(40, 90, 200, 0.35)";
  return {
    name: "raster",
    batch: 4,
    run(units) {
      for (let index = 0; index < units; index++) {
        // 32 curve shapes, all through the center pixel (32, 32). A new path
        // per stroke on purpose: the canvas may cache the coverage of a reused
        // Path2D, and a cache hit would skip the rasterization measured here.
        const offset = (phase++ & 31) * 2;
        const thread = newPath();
        thread.moveTo(0, offset);
        thread.bezierCurveTo(21, RASTER_SIZE - offset, 43, offset, RASTER_SIZE, RASTER_SIZE - offset);
        context.stroke(thread);
      }
      const pixel = context.getImageData(32, 32, 1, 1).data;
      return (pixel[0] ?? 0) + (pixel[3] ?? 0);
    },
  };
}
