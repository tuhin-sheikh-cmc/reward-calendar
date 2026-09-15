const numberFormat = new Intl.NumberFormat('en-US');

export function formatPoints(points: number): string {
  return numberFormat.format(points);
}