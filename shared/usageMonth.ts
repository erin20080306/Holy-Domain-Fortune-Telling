// Computes the Taipei (UTC+8) usage month key "YYYY-MM" for quota buckets.
// Quotas are keyed by user_id + this value so they never reset on device change.
export function getTaipeiUsageMonth(date: Date = new Date()): string {
  // Shift UTC by +8h, then read the UTC calendar of the shifted instant.
  const taipei = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const y = taipei.getUTCFullYear();
  const m = String(taipei.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getTaipeiDayKey(date: Date = new Date()): string {
  const taipei = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const y = taipei.getUTCFullYear();
  const m = String(taipei.getUTCMonth() + 1).padStart(2, '0');
  const d = String(taipei.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
