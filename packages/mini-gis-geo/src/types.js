/**
 * @typedef {{ id: number; name: string; color: string }} CategoryEntry
 * @typedef {{ id: number; categoryId: number; coords: { lat: number; lng: number } }} MarkerEntry
 * @typedef {{
 *   version?: number;
 *   exportedAt?: string;
 *   selectedCategoryId?: number | null;
 *   categories: Record<string, CategoryEntry | Record<string, unknown>>;
 *   markers: Record<string, MarkerEntry | Record<string, unknown>>;
 * }} MiniGisExport
 */

export {}
