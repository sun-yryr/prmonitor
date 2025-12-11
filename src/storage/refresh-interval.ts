export const DEFAULT_REFRESH_INTERVAL_MINUTES = 3;
export const MIN_REFRESH_INTERVAL_MINUTES = 1;
export const MAX_REFRESH_INTERVAL_MINUTES = 60;

export function normalizeRefreshInterval(minutes: number): number {
  if (!Number.isFinite(minutes)) {
    return DEFAULT_REFRESH_INTERVAL_MINUTES;
  }

  return Math.min(
    MAX_REFRESH_INTERVAL_MINUTES,
    Math.max(MIN_REFRESH_INTERVAL_MINUTES, Math.round(minutes))
  );
}
