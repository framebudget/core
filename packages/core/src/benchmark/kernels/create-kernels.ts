import type { Kernel, KernelScope } from "../benchmark.types";
import { createAllocationKernel } from "./allocation-kernel";
import { createCanvasPathKernel } from "./canvas-path-kernel";
import { createFloatKernel } from "./float-kernel";
import { createTypedArrayKernel } from "./typed-array-kernel";

/** The canvas kernel, or null without a working OffscreenCanvas. */
function createCanvasPathKernelIfSupported(scope?: KernelScope): Kernel | null {
  try {
    const Offscreen = scope?.OffscreenCanvas;
    const context = Offscreen ? new Offscreen(16, 16).getContext("2d") : null;
    return context ? createCanvasPathKernel(context) : null;
  } catch {
    // No canvas kernel; the score uses the other kernels.
    return null;
  }
}

/** Built-in kernels. The canvas kernel is only present with a working OffscreenCanvas. */
export function createKernels(scope?: KernelScope): Kernel[] {
  const kernels = [createFloatKernel(), createTypedArrayKernel(), createAllocationKernel()];
  const pathKernel = createCanvasPathKernelIfSupported(scope);
  if (pathKernel) kernels.push(pathKernel);
  return kernels;
}
