# mini-gis-geo

Point-in-polygon and distance helpers for **miniGis** map export JSON. Use it in Node or any ESM JavaScript runtime.

## Why this exists

This stack helps you define **where** your product or service applies on a map, then **check a user’s real-world position** against those regions in **your** application.

Typical situations:

- You offer a service **only in certain parts of a country** (for example only inside a specific city or district). When someone requests the service, you need to know if they are **inside** or **outside** the area you serve, and optionally **how far** they are from your boundary or from a reference point, so you can show a clear message (“we don’t serve this location yet”, “you’re inside the service zone”, etc.).
- In larger cities you might split the map into **neighbourhoods or zones**. You can attach **category metadata** (name, colour, and anything you encode in your workflow) so that—for example—**delivery workers** see which neighbourhood or zone a job belongs to, or your backend can route logic by zone.

Use the **hosted editor** at **[https://abdusamedii.github.io/miniGis/](https://abdusamedii.github.io/miniGis/)** to draw regions and export **one JSON file**. Install **`mini-gis-geo`**, **load that JSON once**, and use the functions below to answer location questions—**no map UI** in your production app.

---

## 1. Create the JSON

Open **[https://abdusamedii.github.io/miniGis/](https://abdusamedii.github.io/miniGis/)**, draw your zones (categories + markers), then save/download the JSON file. That file is what this package reads.

---

## 2. Install in your project

```bash
npm install mini-gis-geo
```

The package is **ESM only** — use `import`, not `require`.

---

## Example: use the export in your application

Put the JSON you downloaded from the site next to your code (for example `config/service-zones.json`), or host it and fetch it. **Parse it once** at startup, then reuse the parsed object for every location check.

```js
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  parseMiniGisExport,
  checkIfInAnyPolygon,
  findFirstCategoryContainingPoint,
} from 'mini-gis-geo'

const __dirname = dirname(fileURLToPath(import.meta.url))

// One-time init: JSON from https://abdusamedii.github.io/miniGis/
const zonesData = parseMiniGisExport(
  readFileSync(join(__dirname, 'config', 'service-zones.json'), 'utf8'),
)

/** Use from your API, worker, or any code that has a user GPS fix */
export function evaluateUserLocation(lat, lng) {
  const served = checkIfInAnyPolygon(lat, lng, zonesData)
  const categoryId = findFirstCategoryContainingPoint(lat, lng, zonesData)
  const zoneName =
    categoryId != null
      ? zonesData.categories[String(categoryId)]?.name ?? null
      : null

  return {
    served,
    categoryId,
    zoneName,
    message: served
      ? zoneName
        ? `Inside zone: ${zoneName}`
        : 'Inside service area'
      : 'Outside service area',
  }
}
```

In the browser: `fetch('/service-zones.json')` then `parseMiniGisExport(await res.text())` (or pass `await res.json()`), keep `zonesData` in memory, and call the geo helpers whenever you have a new `lat`/`lng`.

---

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

License: MIT
