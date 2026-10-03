/**
 * Builds a fresh object from key/value pairs, keeping their order. Same result
 * as Object.fromEntries, which the ES2018 boot script cannot rely on.
 */
export function fromEntries<Value>(entries: readonly (readonly [string, Value])[]): Record<string, Value> {
  return Object.assign({}, ...entries.map(([key, value]) => ({ [key]: value }))) as Record<string, Value>;
}
