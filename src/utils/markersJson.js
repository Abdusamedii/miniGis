import { categoryStore } from '../services/categoryStore.js'
import { markerStore } from '../services/markerStore.js'

const EXPORT_VERSION = 1

/**
 * Same shape as parsed export JSON (for tools like `mini-gis-geo`).
 * @param {Map<number, { lat: number; lng: number; categoryId: number }>} markersById
 * @param {Map<number, { id: number; name: string; color: string }>} categoriesById
 * @param {number | null} selectedCategoryId
 * @returns {object}
 */
export function getProjectExportObject(
  markersById,
  categoriesById,
  selectedCategoryId = null,
) {
  const markers = {}
  for (const [id, entry] of markersById) {
    markers[String(id)] = {
      id,
      categoryId: entry.categoryId,
      coords: { lat: entry.lat, lng: entry.lng },
    }
  }

  const categories = {}
  for (const [id, cat] of categoriesById) {
    categories[String(id)] = {
      id: cat.id,
      name: cat.name,
      color: cat.color,
    }
  }

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    selectedCategoryId,
    categories,
    markers,
  }
}

/**
 * Full project snapshot: categories, markers, UI selection, metadata.
 * @param {Map<number, { lat: number; lng: number; categoryId: number }>} markersById
 * @param {Map<number, { id: number; name: string; color: string }>} categoriesById
 * @param {number | null} selectedCategoryId
 * @returns {string}
 */
export function markersMapToJSON(
  markersById,
  categoriesById,
  selectedCategoryId = null,
) {
  return JSON.stringify(
    getProjectExportObject(markersById, categoriesById, selectedCategoryId),
    null,
    2,
  )
}

/**
 * @param {Map<number, { lat: number; lng: number; categoryId: number }>} markersById
 * @param {Map<number, { id: number; name: string; color: string }>} categoriesById
 * @param {string} [filename]
 */
export function downloadMarkersJSON(
  markersById,
  categoriesById,
  filename = 'mini-gis-export.json',
) {
  const json = markersMapToJSON(
    markersById,
    categoriesById,
    categoryStore.getSelectedCategoryId(),
  )
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Load a saved project into both stores. Categories are applied first, then markers.
 * @param {string} text raw JSON
 */
export function loadProjectFromJSONString(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON')
  }
  if (data === null || typeof data !== 'object') {
    throw new Error('JSON root must be an object')
  }

  const categories = data.categories
  const markers = data.markers

  if (categories === undefined || typeof categories !== 'object') {
    throw new Error('Missing "categories" object')
  }
  if (markers === undefined || typeof markers !== 'object') {
    throw new Error('Missing "markers" object')
  }

  const selected =
    data.selectedCategoryId === undefined
      ? undefined
      : data.selectedCategoryId === null
        ? null
        : Number(data.selectedCategoryId)

  categoryStore.hydrateFromExport(categories, selected)
  markerStore.hydrateFromExport(markers, (cid) =>
    Boolean(categoryStore.getCategoryById(cid)),
  )
}
