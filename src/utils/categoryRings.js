/**
 * @param {Array<[number, { lat: number; lng: number; categoryId: number }]>} entries
 * @returns {Map<number, Array<[number, { lat: number; lng: number; categoryId: number }]>>}
 */
export function groupEntriesByCategory(entries) {
  const byGroup = new Map()
  for (const pair of entries) {
    const [, e] = pair
    const cid = e.categoryId
    if (!byGroup.has(cid)) byGroup.set(cid, [])
    byGroup.get(cid).push(pair)
  }
  for (const list of byGroup.values()) {
    list.sort((a, b) => a[0] - b[0])
  }
  return byGroup
}

/**
 * Leaflet [lat, lng] ring for Polygon (≥3 points). Polygon closes itself.
 * @param {Array<[number, { lat: number; lng: number }]>} sortedEntries
 * @returns {Array<[number, number]> | null}
 */
export function ringPositionsLatLng(sortedEntries) {
  if (sortedEntries.length < 3) return null
  return sortedEntries.map(([, e]) => [e.lat, e.lng])
}

/**
 * Closed stroke for 2 points: p0 → p1 → p0
 * @param {Array<[number, { lat: number; lng: number }]>} sortedEntries
 * @returns {Array<[number, number]> | null}
 */
export function ringPositionsForTwoPoints(sortedEntries) {
  if (sortedEntries.length !== 2) return null
  const [, a] = sortedEntries[0]
  const [, b] = sortedEntries[1]
  return [
    [a.lat, a.lng],
    [b.lat, b.lng],
    [a.lat, a.lng],
  ]
}
