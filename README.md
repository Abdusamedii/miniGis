# miniGis

Monorepo: hosted map editor + **`mini-gis-geo`** on npm. Below is the full workflow for using the library.

## 1. Create the JSON

Open **[https://abdusamedii.github.io/miniGis/](https://abdusamedii.github.io/miniGis/)**, draw your zones (categories + markers), then save/download the JSON file. That export is what **`mini-gis-geo`** reads.

## 2. Install in your project

```bash
npm install mini-gis-geo
```

The package is **ESM only** — use `import`, not `require`.

Load the file (string or object), parse once, then call the functions below:

```js
import { readFileSync } from 'node:fs'
import { parseMiniGisExport, checkIfInAnyPolygon } from 'mini-gis-geo'

const data = parseMiniGisExport(readFileSync('./zones.json', 'utf8'))
```

**This monorepo** can depend on the workspace package with `"mini-gis-geo": "workspace:*"` instead of npm.

## 3. What each function does

Call these in order when you’re learning the API: first parse and inspect the export, then geometry helpers, then point tests and distances.

### `parseMiniGisExport(raw)`

1. You pass a **JSON string** or an **already-parsed object** from the editor export.
2. It checks that `categories` and `markers` exist and are objects.
3. It returns that object as `data` for every other function, or **throws** if the payload is invalid.

### `getCategoryIds(data)`

1. Scans `data.categories`.
2. Returns a **sorted array of numeric category ids** so you can list zones or loop over them.

### `getSortedMarkersForCategory(data, categoryId)`

1. Collects every marker whose `categoryId` matches.
2. Sorts them by **marker id ascending** (same ring order as the editor).
3. Returns `{ id, lat, lng }[]` for that category.

### `getCategoryPolygonXY(data, categoryId)`

1. Uses `getSortedMarkersForCategory` for that category.
2. If there are **fewer than three** markers, returns **`null`** (no closed polygon).
3. Otherwise returns an array of `{ x, y }` with **`x = lng`**, **`y = lat`** for the closed ring.

### `latLngToXY(lat, lng)`

1. Maps one GPS point to the **same plane** the library uses for polygons: `{ x: lng, y: lat }`.
2. Use this when you compare a location to rings yourself.

### `isPointInPolygon(point, polygon)`

1. **`point`** is `{ x, y }`; **`polygon`** is an array of `{ x, y }` vertices in order.
2. Uses ray casting and returns **`true`** if the point is inside, **`false`** if not.
3. Low-level helper; category helpers below build the polygon for you.

### `findCategoriesContainingPoint(lat, lng, data)`

1. For each category, builds the ring (if it has ≥3 markers) and tests the point.
2. Returns **all category ids** whose polygon contains `(lat, lng)`, **sorted ascending**.
3. Can be an **empty array** or **several ids** if zones overlap.

### `checkIfInAnyPolygon(lat, lng, data)`

1. Runs the same containment logic as `findCategoriesContainingPoint`.
2. Returns **`true`** if the point is inside **at least one** polygon, else **`false`**.

### `findFirstCategoryContainingPoint(lat, lng, data)`

1. Calls `findCategoriesContainingPoint` and takes the **first** id in that array.
2. If none match, returns **`null`**.
3. When multiple zones overlap, the **smallest category id** wins (because the list is sorted).

### `toRad(deg)`

1. Converts **degrees to radians** (`deg * π / 180`).
2. Helper for `haversineMeters` if you need angles yourself.

### `haversineMeters(lat1, lng1, lat2, lng2)`

1. Computes **great-circle distance in meters** between two WGS84 points.
2. Does not use the export JSON — only the four numbers.

### `findNearestPoint(lat, lng, data)`

1. Loops **all markers** in `data.markers`.
2. Picks the marker with smallest **Haversine** distance to `(lat, lng)` (tie-break: lower marker id).
3. Returns **`{ markerId, categoryId, distanceMeters, coords }`** or **`null`** if there are no markers.

---

**Note:** Inside/outside tests treat **lat/lng as x/y on a plane** (city-scale zones). Not a full spherical GIS library.

## Scripts (this repository)

```bash
npm install
npm run dev      # run the map editor locally
npm run build
npm run lint
```

Package tests: `cd packages/mini-gis-geo && npm test`.
