/**
 * Generates all k-element combinations of the given array.
 * Order of elements within each combination follows their original order.
 */
export function combinations<T>(items: readonly T[], k: number): T[][] {
  const results: T[][] = [];
  const combo: T[] = [];

  function backtrack(start: number): void {
    if (combo.length === k) {
      results.push([...combo]);
      return;
    }
    for (let i = start; i < items.length; i++) {
      combo.push(items[i]!);
      backtrack(i + 1);
      combo.pop();
    }
  }

  backtrack(0);
  return results;
}