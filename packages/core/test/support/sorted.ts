/** A sorted copy in UTF-16 code unit order, the order of a plain `sort()`. */
export function sorted(values: readonly string[]): string[] {
  return [...values].sort((left, right) => (left < right ? -1 : Number(left > right)));
}
