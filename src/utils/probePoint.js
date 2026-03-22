import {
  checkIfInAnyPolygon,
  findCategoriesContainingPoint,
  findFirstCategoryContainingPoint,
  findNearestPoint,
  getCategoryIds,
  getCategoryPolygonXY,
  getSortedMarkersForCategory,
  isPointInPolygon,
  latLngToXY,
  parseMiniGisExport,
} from 'mini-gis-geo'

/**
 * @param {number} n
 * @returns {string}
 */
function fmtCoord(n) {
  return Number.isFinite(n) ? n.toFixed(6) : String(n)
}

/**
 * @param {null | { markerId: number; categoryId: number; distanceMeters: number; coords: { lat: number; lng: number } }} nearest
 * @returns {string}
 */
function formatFindNearestResult(nearest) {
  if (nearest === null) {
    return 'null (no markers)'
  }
  return `{ markerId: ${nearest.markerId}, categoryId: ${nearest.categoryId}, distanceMeters: ${nearest.distanceMeters.toFixed(2)}, coords: { lat: ${fmtCoord(nearest.coords.lat)}, lng: ${fmtCoord(nearest.coords.lng)} } }`
}

/**
 * Multi-line description for the UI. Function names are wrapped in **...** for bold rendering.
 * @param {number} lat
 * @param {number} lng
 * @param {object} data parsed export (same shape as parseMiniGisExport output)
 * @returns {string}
 */
export function buildMethodDescriptionForProbe(lat, lng, data) {
  const xy = latLngToXY(lat, lng)
  const inAny = checkIfInAnyPolygon(lat, lng, data)
  const containingIds = findCategoriesContainingPoint(lat, lng, data)
  const firstId = findFirstCategoryContainingPoint(lat, lng, data)
  const nearest = findNearestPoint(lat, lng, data)
  const categoryCount = getCategoryIds(data).length
  const markerCount = Object.keys(data.markers).length

  /** @type {string[]} */
  const lines = [
    'How this probe was evaluated (mini-gis-geo):',
    '',
    `• **checkIfInAnyPolygon**(lat, lng, data) → ${inAny}`,
    '',
    `• **findNearestPoint**(lat, lng, data) → ${formatFindNearestResult(nearest)}`,
    '',
    `• **findCategoriesContainingPoint**(lat, lng, data) → ${JSON.stringify(containingIds)}`,
    '',
    `• **findFirstCategoryContainingPoint**(lat, lng, data) → ${firstId === null ? 'null' : String(firstId)}`,
    '',
    `• **latLngToXY**(lat, lng) → for this point: { x: ${fmtCoord(xy.x)}, y: ${fmtCoord(xy.y)} }`,
    '',
    `• **getCategoryIds**(data) → ${JSON.stringify(getCategoryIds(data))}`,
    '',
    `• **parseMiniGisExport**(rawExport) → ${categoryCount} categories, ${markerCount} markers loaded`,
    '',
    'Per category:',
  ]

  for (const cid of getCategoryIds(data)) {
    const markers = getSortedMarkersForCategory(data, cid)
    const poly = getCategoryPolygonXY(data, cid)
    lines.push('')
    lines.push(
      `• **getSortedMarkersForCategory**(data, ${cid}) → ${markers.length} marker(s).`,
    )
    if (!poly) {
      lines.push(
        `• **getCategoryPolygonXY**(data, ${cid}) → null (≥3 markers required for a closed ring). **isPointInPolygon** — not run.`,
      )
      continue
    }
    const inside = isPointInPolygon(xy, poly)
    lines.push(
      `• **getCategoryPolygonXY**(data, ${cid}) → ${poly.length} vertices (lng/lat as x/y).`,
    )
    lines.push(
      `• **isPointInPolygon**(**latLngToXY**(lat, lng), polygon) → ${inside}`,
    )
  }

  return lines.join('\n')
}

/**
 * @typedef {{
 *   lat: number;
 *   lng: number;
 *   insideAnyPolygon: boolean;
 *   categoryId: number | null;
 *   categoryName: string | null;
 *   nearestPoint: null | { markerId: number; categoryId: number; distanceMeters: number; coords: { lat: number; lng: number } };
 *   methodDescription: string;
 * }} ProbeAnalysisResult
 */

/**
 * Point-in-polygon probe aligned with mini-gis-geo (rings need ≥3 markers per category).
 * @param {number} lat
 * @param {number} lng
 * @param {unknown} rawExport from getProjectExportObject in markersJson.js
 * @returns {ProbeAnalysisResult}
 */
export function analyzeProbeAt(lat, lng, rawExport) {
  const data = parseMiniGisExport(rawExport)
  const insideAnyPolygon = checkIfInAnyPolygon(lat, lng, data)
  const categoryId = findFirstCategoryContainingPoint(lat, lng, data)
  const nearestPoint = findNearestPoint(lat, lng, data)

  let categoryName = null
  if (categoryId != null) {
    const raw = data.categories[String(categoryId)]
    const rec = raw && typeof raw === 'object' ? raw : null
    categoryName =
      rec && 'name' in rec && typeof rec.name === 'string'
        ? rec.name
        : `Category ${categoryId}`
  }

  return {
    lat,
    lng,
    insideAnyPolygon,
    categoryId,
    categoryName,
    nearestPoint,
    methodDescription: buildMethodDescriptionForProbe(lat, lng, data),
  }
}
