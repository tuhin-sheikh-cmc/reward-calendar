const numberFormat = new Intl.NumberFormat('en-US');

export function formatPoints(points: number): string {
  return numberFormat.format(points);
}

const dateTimeFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? isoDate : dateTimeFormat.format(date);
}