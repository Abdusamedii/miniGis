import assert from 'node:assert/strict'
import {
  checkIfInAnyPolygon,
  findCategoriesContainingPoint,
  findNearestPoint,
  haversineMeters,
  isPointInPolygon,
  latLngToXY,
  parseMiniGisExport,
} from './src/index.js'

const sample = {
  version: 1,
  exportedAt: '2025-01-01T00:00:00.000Z',
  selectedCategoryId: 1,
  categories: {
    '1': { id: 1, name: 'A', color: '#ff0000' },
  },
  markers: {
    '1': { id: 1, categoryId: 1, coords: { lat: 0, lng: 0 } },
    '2': { id: 2, categoryId: 1, coords: { lat: 0, lng: 2 } },
    '3': { id: 3, categoryId: 1, coords: { lat: 2, lng: 2 } },
    '4': { id: 4, categoryId: 1, coords: { lat: 2, lng: 0 } },
  },
}

parseMiniGisExport(sample)
const inside = findCategoriesContainingPoint(1, 1, sample)
assert.deepEqual(inside, [1])
assert.equal(checkIfInAnyPolygon(1, 1, sample), true)

const outside = findCategoriesContainingPoint(5, 5, sample)
assert.deepEqual(outside, [])
assert.equal(checkIfInAnyPolygon(5, 5, sample), false)

const square = [
  latLngToXY(0, 0),
  latLngToXY(0, 2),
  latLngToXY(2, 2),
  latLngToXY(2, 0),
]
assert.equal(isPointInPolygon(latLngToXY(1, 1), square), true)
assert.equal(isPointInPolygon(latLngToXY(3, 3), square), false)

assert.equal(haversineMeters(0, 0, 0, 0), 0)
const nearest = findNearestPoint(0.001, 0.001, sample)
assert.equal(nearest?.markerId, 1)
assert.ok(nearest && nearest.distanceMeters > 0 && nearest.distanceMeters < 200_000)

const onMarker1 = findNearestPoint(0, 0, sample)
assert.equal(onMarker1?.markerId, 1)
assert.equal(onMarker1?.distanceMeters, 0)

const emptyMarkers = {
  ...sample,
  markers: {},
}
assert.equal(findNearestPoint(0, 0, emptyMarkers), null)

console.log('mini-gis-geo smoke OK')
