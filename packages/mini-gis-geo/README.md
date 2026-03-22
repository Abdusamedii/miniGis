# mini-gis-geo

Point-in-polygon and distance helpers for **miniGis** map export JSON: categories plus markers with `lat` / `lng`. No map UI—pure functions for Node or any ESM JavaScript runtime.

Designed for JSON exported from the [miniGis](https://github.com/Abdusamedii/miniGis) editor (or any object with the same `categories` / `markers` shape).

## Install

```bash
npm install mini-gis-geo
```

This package is **ESM only** (`"type": "module"`). Use `import`, not `require`.

## Quick start

```js
import { readFileSync } from 'node:fs'
import {
  parseMiniGisExport,
  checkIfInAnyPolygon,
  findFirstCategoryContainingPoint,
} from 'mini-gis-geo'

const raw = readFileSync('./zones.json', 'utf8')
const data = parseMiniGisExport(raw)

const lat = 42.123456
const lng = 21.123456

const served = checkIfInAnyPolygon(lat, lng, data)
const zoneId = findFirstCategoryContainingPoint(lat, lng, data)
const zoneName =
  zoneId != null ? data.categories[String(zoneId)]?.name : null
```

## Export JSON shape

The parser expects an object with at least:

| Field | Description |
| --- | --- |
| `categories` | Record of id (string key) → `{ id, name, color, ... }` |
| `markers` | Record of id (string key) → `{ id, categoryId, coords: { lat, lng } }` |

Optional top-level fields (e.g. `version`, `exportedAt`, `selectedCategoryId`) are ignored by the geo logic but preserved on the parsed object.

**Rings:** For each `categoryId`, markers are ordered by **ascending marker `id`** to form one closed ring. **At least three** markers per category are required for polygon containment; fewer yield no fillable area for hit tests.

## API

### `parseMiniGisExport(raw)`

- **Input:** JSON string or already-parsed object.
- **Output:** The same object after validating `categories` and `markers`.
- **Throws** if JSON is invalid or required fields are missing.

Call once when loading your file; pass the result as `data` to everything below.

### `getCategoryIds(data)`

Sorted array of numeric category ids present in `categories`.

### `getSortedMarkersForCategory(data, categoryId)`

Markers for that category, sorted by marker id (ring order).

### `getCategoryPolygonXY(data, categoryId)`

Vertices as `{ x, y }` with `x = lng`, `y = lat`, or `null` if fewer than three markers.

### `latLngToXY(lat, lng)` / `isPointInPolygon(point, polygon)`

- `latLngToXY` maps a WGS84 point to the plane used internally (`x` = longitude, `y` = latitude).
- `isPointInPolygon` is ray-casting on an array of `{ x, y }` in order.

### `findCategoriesContainingPoint(lat, lng, data)`

All category ids whose polygon contains the point (ascending id order). Can be empty or multiple if zones overlap.

### `checkIfInAnyPolygon(lat, lng, data)`

`true` if the point lies inside at least one category polygon.

### `findFirstCategoryContainingPoint(lat, lng, data)`

First matching category id, or `null`. When several polygons contain the point, this is the **lowest** category id among matches.

### `toRad(deg)` / `haversineMeters(lat1, lng1, lat2, lng2)`

Radians helper and great-circle distance in **meters** between two WGS84 points.

### `findNearestPoint(lat, lng, data)`

Nearest marker in the export by Haversine distance:  
`{ markerId, categoryId, distanceMeters, coords }` or `null` if there are no markers.

## Limitations

Containment uses **latitude and longitude as Cartesian x/y** (lng → x, lat → y). That matches the miniGis editor preview and is reasonable for **city-scale** zones. It is **not** a full spherical polygon library; for large geographic areas consider a dedicated GIS stack.

## Development

From this package directory:

```bash
npm test
```

## License

MIT
