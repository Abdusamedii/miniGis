# Consumer smoke test

Isolated app that depends on `mini-gis-geo` via `file:../../packages/mini-gis-geo` (same resolution pattern as after `npm install mini-gis-geo` from the registry).

```bash
cd test/consumer-demo
npm install
npm run dev
```

Open the URL Vite prints, load JSON (or use **Load bundled sample**), set **x** = longitude and **y** = latitude, then **Run checks**.

The bundled sample polygon uses **0–2°** latitude and **0–2°** longitude (Atlantic near the equator). Default test values **x=1, y=1** are **1°E, 1°N** — the **center** of that square, so `checkIfInAnyPolygon` is **true** on purpose. For a city you drew in the editor, use that city’s **decimal degrees** in the same fields.

```bash
npm run build   # optional: verify production bundle
```
