# miniGis

## Why this exists

This project helps you define **where** your product or service applies on a map, then **check a user’s real-world position** against those regions in your own application.

Typical situations:

- You offer a service **only in certain parts of a country** (for example only inside the city of **Ferizaj**). When someone requests the service, you need to know if they are **inside** or **outside** the area you serve, and optionally **how far** they are from your boundary or from a reference point, so you can show a clear message (“we don’t serve this location yet”, “you’re inside the service zone”, etc.).
- In larger cities you might split the map into **neighbourhoods or zones**. You can attach **category metadata** (name, colour, and anything you encode in your workflow) so that—for example—**delivery workers** see which neighbourhood or zone a job belongs to, or your backend can route logic by zone.

The **web app** is the **editor**: you draw regions on a world map and export **one JSON file** that describes your zones. The **`mini-gis-geo`** **package** is the **runtime library**: you add it to your server or client app, load that JSON, and call small functions to answer “is this GPS point inside my zone?”, “which zone?”, “how far is the nearest boundary marker?”, and so on.

---

## Part 1: The miniGis web app

**What it does**

- Runs in the browser with **OpenStreetMap** tiles.
- You create **categories** (each is a named, coloured region concept—e.g. “Ferizaj centre”, “Neighbourhood A”).
- You **place markers** along the border of each region. Markers with the same category are connected **in marker ID order**; with **three or more** markers the shape is treated as a **closed polygon** (the preview matches what the library will test).
- You can **save** the project as JSON and **load** it again to edit.

**What it does *not* do by itself**

- It does not host your production API. It only **produces the JSON** your real app will ship with or load at runtime.

**Modes**

- **Draw** — build categories and markers.
- **Probe point** — click the map to see how the same rules behave (inside/outside, nearest marker distance, etc.) using the same logic as the package.

---

## Part 2: The `mini-gis-geo` package

**What it does**

- You **`npm install`** this package into **your** application (mobile app backend, Node service, bundled frontend—wherever you can run JavaScript).
- You pass it the **JSON** exported from the web app (either as a parsed object or a JSON string).
- It exposes **pure functions**: given `lat` / `lng` and that data, you get booleans, lists, distances, and so on—**no map UI required**.

**Important limitation**

- Point-in-polygon uses **latitude/longitude treated as x/y** on a plane (longitude → x, latitude → y). That matches the editor preview and is fine for **city-scale** areas. It is **not** a full spherical polygon library; for country-scale precision you might prefer a dedicated GIS pipeline—but for “service in Ferizaj”-style zones it is usually acceptable.

---

## JSON shape (what the app exports)

The export is an object with at least:

- `categories` — map of category id → `{ id, name, color }` (and optional extra fields you don’t rely on in the package).
- `markers` — map of marker id → `{ id, categoryId, coords: { lat, lng } }`.

The library builds **one ring per category** from markers sharing that `categoryId`, sorted by **marker id**. **At least three markers** are required for a **filled polygon** test; fewer markers mean no closed area for containment checks.

---

## Package API: each function and when to use it

### `parseMiniGisExport(raw)`

- **Input:** JSON string or already-parsed object.
- **Output:** Validated export object (throws if `categories` / `markers` are missing).
- **Use case:** Call once when your app loads the file, then pass the result to the other functions as `data`.

### `getCategoryIds(data)`

- **Output:** Sorted list of category ids.
- **Use case:** List zones, iterate to show labels, or drive UI from your own metadata keyed by id.

### `getSortedMarkersForCategory(data, categoryId)`

- **Output:** Markers for one category, sorted by marker id (the ring order).
- **Use case:** Debug, show boundary points, or rebuild geometry on your side.

### `getCategoryPolygonXY(data, categoryId)`

- **Output:** Array of `{ x, y }` vertices with `x = lng`, `y = lat`, or `null` if fewer than three markers.
- **Use case:** Advanced: feed the ring into your own rendering or algorithms, or combine with `isPointInPolygon` manually.

### `latLngToXY(lat, lng)`

- **Output:** `{ x: lng, y: lat }`.
- **Use case:** Convert a GPS fix to the same coordinate system the polygon tests use.

### `isPointInPolygon(point, polygon)`

- **Input:** `point` = `{ x, y }`, `polygon` = array of `{ x, y }` in order.
- **Output:** `true` / `false` (ray casting).
- **Use case:** Low-level hit test if you build polygons yourself; the high-level helpers below use this internally.

### `findCategoriesContainingPoint(lat, lng, data)`

- **Output:** Array of **category ids** whose polygon contains the point (can be empty; can be more than one if zones overlap).
- **Use case:** “Which zones apply?” — e.g. assign a neighbourhood or apply multiple service rules.

### `checkIfInAnyPolygon(lat, lng, data)`

- **Output:** `true` if the point is inside **at least one** category polygon, else `false`.
- **Use case:** Fast **gate**: “Do we serve this GPS at all?”

### `findFirstCategoryContainingPoint(lat, lng, data)`

- **Output:** One category id **or** `null`.
- **Use case:** “Which single zone wins?” — when overlaps exist, the **lowest category id** among matches is returned. Map that id to `categories[id].name` in your app for user-facing copy (e.g. neighbourhood name).

### `checkIfInAnyPolygon` vs `findFirstCategoryContainingPoint`

- Use **`checkIfInAnyPolygon`** for a simple **yes/no** service area.
- Use **`findFirstCategoryContainingPoint`** plus **`data.categories`** when you need a **label** (which zone / neighbourhood).

### `toRad(deg)` and `haversineMeters(lat1, lng1, lat2, lng2)`

- **Output:** Haversine **distance in meters** between two WGS84 points (`toRad` is a helper in radians).
- **Use case:** “How far is the user from a reference point?” — not required for inside/outside, but useful for messaging (“closest depot is 5 km away”).

### `findNearestPoint(lat, lng, data)`

- **Output:** The **nearest marker** in the export to the given point: `{ markerId, categoryId, distanceMeters, coords }`, or `null` if there are no markers.
- **Use case:** “Which corner of the drawn boundary is closest?” or approximate distance to your **drawn** geometry. Distance uses **Haversine** in meters.

---

## Step-by-step: use `mini-gis-geo` in another project

Follow these steps in **your** app (Node, a bundled frontend, React Native with a JS runtime, etc.). The library is **ESM** (`"type": "module"` in the package).

### Step 1 — Install the package

**Inside this monorepo**, the app uses the workspace alias:

```json
"mini-gis-geo": "workspace:*"
```

**In a separate project**, either publish `packages/mini-gis-geo` to npm and run `npm install mini-gis-geo`, or install the folder from disk:

```bash
npm install /absolute/or/relative/path/to/miniGis/packages/mini-gis-geo
```

### Step 2 — Import the functions you need

Use named imports from the package entry (see [Package API](#package-api-each-function-and-when-to-use-it) for the full list):

```js
import {
  parseMiniGisExport,
  checkIfInAnyPolygon,
  findFirstCategoryContainingPoint,
  findNearestPoint,
} from 'mini-gis-geo'
```

### Step 3 — Load the JSON your editor exported

You must end up with either a **string** or a **parsed object** that matches the [JSON shape](#json-shape-what-the-app-exports) (`categories` + `markers`).

**Node (read a file once at startup):**

```js
import { readFileSync } from 'node:fs'

const jsonString = readFileSync(new URL('./zones.json', import.meta.url), 'utf8')
```

**Browser or any environment with `fetch`:**

```js
const res = await fetch('/zones.json')
const jsonString = await res.text()
// or: const raw = await res.json()  — you can pass the object straight to parseMiniGisExport
```

**Bundlers (optional):** if your toolchain supports JSON import, you can `import raw from './zones.json' assert { type: 'json' }` (syntax varies by bundler) and pass `raw` to `parseMiniGisExport`.

### Step 4 — Parse and validate the export

Call **`parseMiniGisExport`** once. It accepts a JSON string or an already-parsed object, checks that `categories` and `markers` exist, and returns the same object typed for the rest of the API. It **throws** if the payload is invalid.

```js
const data = parseMiniGisExport(jsonString)
// or: parseMiniGisExport(alreadyParsedObject)
```

Keep `data` in memory (module singleton, React context, server cache, etc.) and reuse it for every location check.

### Step 5 — Call the geo helpers with a GPS fix

Pass **latitude**, **longitude**, and the parsed **`data`** (order is always `lat`, `lng`, `data` for the high-level helpers):

```js
const lat = 42.123456
const lng = 21.123456

const served = checkIfInAnyPolygon(lat, lng, data)

const zoneId = findFirstCategoryContainingPoint(lat, lng, data)
const zoneName =
  zoneId != null ? data.categories[String(zoneId)]?.name : null

const nearest = findNearestPoint(lat, lng, data)
// nearest is null if there are no markers; else nearest.distanceMeters, nearest.categoryId, …
```

From here, branch on `served`, show `zoneName` to users or staff, and use `nearest` for distance or diagnostics. For overlap cases or multiple zones, use `findCategoriesContainingPoint` (documented above).

### Minimal end-to-end example (Node)

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

console.log('in service area:', checkIfInAnyPolygon(lat, lng, data))
console.log(
  'zone:',
  findFirstCategoryContainingPoint(lat, lng, data),
)
```

---

## Scripts (this repo)

```bash
npm install
npm run dev      # run the map editor locally
npm run build
npm run lint
```

The package tests live under `packages/mini-gis-geo` (`npm test` inside that folder).
