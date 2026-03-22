/**
 * miniGis export JSON: categories + markers; polygons are marker rings per category
 * (marker ids ascending), matching the web app’s WorldMap / categoryRings behavior.
 */

/**
 * @typedef {{ x: number; y: number }} XYPoint
 */

/**
 * @param {XYPoint} point
 * @param {XYPoint[]} polygon
 * @returns {boolean}
 */
export function isPointInPolygon(point, polygon) {
  const { x, y } = point
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y

    const intersects =
      (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi

    if (intersects) inside = !inside
  }

  return inside
}

/**
 * Map (lat, lng) to plane coordinates for ray-casting: x = longitude, y = latitude.
 * @param {number} lat
 * @param {number} lng
 * @returns {XYPoint}
 */
export function latLngToXY(lat, lng) {
  return { x: lng, y: lat }
}

/**
 * @param {number} deg
 * @returns {number}
 */
export function toRad(deg) {
  return (deg * Math.PI) / 180
}

/**
 * Great-circle distance between two WGS84 points (meters).
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number}
 */
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000

  const phi1 = toRad(lat1)
  const phi2 = toRad(lat2)
  const dPhi = toRad(lat2 - lat1)
  const dLambda = toRad(lng2 - lng1)

  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * @param {unknown} raw
 * @returns {import('./types.js').MiniGisExport}
 */
export function parseMiniGisExport(raw) {
  let data = raw
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch {
      throw new Error('Invalid JSON string')
    }
  }
  if (data === null || typeof data !== 'object') {
    throw new Error('Export root must be an object')
  }

  const categories = /** @type {Record<string, unknown>} */ (data).categories
  const markers = /** @type {Record<string, unknown>} */ (data).markers

  if (categories === undefined || typeof categories !== 'object' || categories === null) {
    throw new Error('Missing or invalid "categories" object')
  }
  if (markers === undefined || typeof markers !== 'object' || markers === null) {
    throw new Error('Missing or invalid "markers" object')
  }

  return /** @type {import('./types.js').MiniGisExport} */ (data)
}

/**
 * Marker entries for one category, sorted by marker id (ascending) — same ring order as the app.
 * @param {import('./types.js').MiniGisExport} data
 * @param {number} categoryId
 * @returns {Array<{ id: number; lat: number; lng: number }>}
 */
export function getSortedMarkersForCategory(data, categoryId) {
  const out = []
  for (const [key, val] of Object.entries(data.markers)) {
    if (val === null || typeof val !== 'object') continue
    const m = /** @type {{ id?: number; categoryId?: number; coords?: { lat?: number; lng?: number } }} */ (
      val
    )
    const id =
      typeof m.id === 'number' && Number.isFinite(m.id) ? m.id : Number(key)
    if (!Number.isFinite(id)) continue
    const cid = m.categoryId
    const lat = m.coords?.lat
    const lng = m.coords?.lng
    if (cid !== categoryId) continue
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    out.push({ id, lat: /** @type {number} */ (lat), lng: /** @type {number} */ (lng) })
  }
  out.sort((a, b) => a.id - b.id)
  return out
}

/**
 * Closed polygon vertices as x/y (lng/lat). Requires at least 3 markers; fewer return null
 * (same as no fillable area in the app for <3 points).
 * @param {import('./types.js').MiniGisExport} data
 * @param {number} categoryId
 * @returns {XYPoint[] | null}
 */
export function getCategoryPolygonXY(data, categoryId) {
  const sorted = getSortedMarkersForCategory(data, categoryId)
  if (sorted.length < 3) return null
  return sorted.map((m) => latLngToXY(m.lat, m.lng))
}

/**
 * All category ids present in the export (from `categories` keys / ids).
 * @param {import('./types.js').MiniGisExport} data
 * @returns {number[]}
 */
export function getCategoryIds(data) {
  const ids = new Set()
  for (const [key, val] of Object.entries(data.categories)) {
    if (val === null || typeof val !== 'object') continue
    const c = /** @type {{ id?: number }} */ (val)
    const id = typeof c.id === 'number' && Number.isFinite(c.id) ? c.id : Number(key)
    if (Number.isFinite(id)) ids.add(id)
  }
  return [...ids].sort((a, b) => a - b)
}

/**
 * @param {number} lat
 * @param {number} lng
 * @param {import('./types.js').MiniGisExport} data
 * @returns {number[]} category ids whose polygon contains the point (ascending id order)
 */
export function findCategoriesContainingPoint(lat, lng, data) {
  const pt = latLngToXY(lat, lng)
  const hits = []
  for (const categoryId of getCategoryIds(data)) {
    const poly = getCategoryPolygonXY(data, categoryId)
    if (!poly) continue
    if (isPointInPolygon(pt, poly)) hits.push(categoryId)
  }
  return hits
}

/**
 * True if the point lies inside at least one category polygon (rings with ≥3 markers).
 * Implemented as `findCategoriesContainingPoint(lat, lng, data).length > 0`.
 * @param {number} lat
 * @param {number} lng
 * @param {import('./types.js').MiniGisExport} data
 * @returns {boolean}
 */
export function checkIfInAnyPolygon(lat, lng, data) {
  return findCategoriesContainingPoint(lat, lng, data).length > 0
}

/**
 * First matching category id, or null.
 * @param {number} lat
 * @param {number} lng
 * @param {import('./types.js').MiniGisExport} data
 * @returns {number | null}
 */
export function findFirstCategoryContainingPoint(lat, lng, data) {
  const all = findCategoriesContainingPoint(lat, lng, data)
  return all.length ? all[0] : null
}

/**
 * Nearest marker in the export to (lat, lng), by {@link haversineMeters}.
 * @param {number} lat
 * @param {number} lng
 * @param {import('./types.js').MiniGisExport} data
 * @returns {{ markerId: number; categoryId: number; distanceMeters: number; coords: { lat: number; lng: number } } | null}
 */
export function findNearestPoint(lat, lng, data) {
  let best = null
  let bestDist = Infinity
  let bestId = Infinity

  for (const [key, val] of Object.entries(data.markers)) {
    if (val === null || typeof val !== 'object') continue
    const m = /** @type {{ id?: number; categoryId?: number; coords?: { lat?: number; lng?: number } }} */ (
      val
    )
    const id =
      typeof m.id === 'number' && Number.isFinite(m.id) ? m.id : Number(key)
    if (!Number.isFinite(id)) continue
    const categoryId = m.categoryId
    const mlat = m.coords?.lat
    const mlng = m.coords?.lng
    if (!Number.isFinite(categoryId) || !Number.isFinite(mlat) || !Number.isFinite(mlng)) {
      continue
    }

    const d = haversineMeters(lat, lng, mlat, mlng)
    if (d < bestDist || (d === bestDist && id < bestId)) {
      bestDist = d
      bestId = id
      best = {
        markerId: id,
        categoryId: /** @type {number} */ (categoryId),
        distanceMeters: d,
        coords: { lat: /** @type {number} */ (mlat), lng: /** @type {number} */ (mlng) },
      }
    }
  }

  return best
}
