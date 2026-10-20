import type { Kernel, KernelScope, RasterContext } from "../benchmark.types";
import { createKernels } from "./create-kernels";
import { createRasterKernel, RASTER_SIZE } from "./raster-kernel";

/** A 2D context on an OffscreenCanvas, else on a detached canvas element. */
function rasterContext(scope: KernelScope): RasterContext | null {
  const Offscreen = scope.OffscreenCanvas;
  if (Offscreen) return new Offscreen(RASTER_SIZE, RASTER_SIZE).getContext("2d");
  const canvas = scope.document?.createElement("canvas");
  if (!canvas) return null;
  canvas.width = RASTER_SIZE;
  canvas.height = RASTER_SIZE;
  return canvas.getContext("2d");
}

/** The raster kernel, or null when no 2D canvas can draw a Path2D and read back a pixel. */
function createRasterKernelIfSupported(scope?: KernelScope): Kernel | null {
  try {
    const Path = scope?.Path2D;
    const context = scope && Path ? rasterContext(scope) : null;
    if (!context || !Path) return null;
    const kernel = createRasterKernel(context, () => new Path());
    // One unit up front, so a canvas that refuses the readback drops the kernel instead of failing the run.
    kernel.run(1);
    return kernel;
  } catch {
    // No raster kernel; the score uses the other kernels.
    return null;
  }
}

/**
 * The warm run's kernels: the built-in ones, plus raster with a working 2D
 * canvas. The cold run never measures raster: its slices are too short to
 * hold a flush, and the boot script does not bundle it.
 */
export function createWarmKernels(scope?: KernelScope): Kernel[] {
  const raster = createRasterKernelIfSupported(scope);
  return raster ? [...createKernels(scope), raster] : createKernels(scope);
}
