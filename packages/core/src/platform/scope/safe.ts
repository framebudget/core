/** Runs `callback`, turning any exception into undefined (storage, permissions, odd browsers). */
export function safe<T>(callback: () => T): T | undefined {
  try {
    return callback();
  } catch {
    return undefined;
  }
}
