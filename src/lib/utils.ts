export function formatXp(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function levelForXp(totalXp: number): number {
  return Math.floor(Math.max(0, totalXp) / 1000) + 1;
}
