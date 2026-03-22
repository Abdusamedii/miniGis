import { useCallback, useSyncExternalStore } from 'react'
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  useMapEvents,
} from 'react-leaflet'
import { categoryStore } from '../services/categoryStore.js'
import { markerStore } from '../services/markerStore.js'
import {
  groupEntriesByCategory,
  ringPositionsForTwoPoints,
  ringPositionsLatLng,
} from '../utils/categoryRings.js'
import { getProjectExportObject } from '../utils/markersJson.js'
import { analyzeProbeAt } from '../utils/probePoint.js'

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const FALLBACK_COLOR = '#94a3b8'

const PROBE_MARKER_COLOR = '#0ea5e9'

/** Wraps **name** segments in strong emphasis (probe method trace). */
function renderDescriptionWithBold(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-slate-800">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

/** Clicks on circle markers must not add a new point (marker has priority over polygon/map). */
function isClickOnCircleMarker(originalEvent) {
  const t = originalEvent?.target
  if (!t || typeof t.tagName !== 'string') return false
  if (t.tagName.toLowerCase() !== 'circle') return false
  return Boolean(t.closest?.('.leaflet-overlay-pane'))
}

function MapClickCapture({ onLocation }) {
  useMapEvents({
    click(e) {
      if (isClickOnCircleMarker(e.originalEvent)) return
      onLocation(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

/** @typedef {'draw' | 'probe'} MapMode */

/**
 * @param {{
 *   mode?: MapMode;
 *   probeResult?: import('../utils/probePoint.js').ProbeAnalysisResult | null;
 *   onProbeResult?: (value: import('../utils/probePoint.js').ProbeAnalysisResult | null) => void;
 * }} props
 */
export function WorldMap({
  mode = 'draw',
  probeResult = null,
  onProbeResult = () => {},
}) {
  useSyncExternalStore(
    markerStore.subscribe,
    markerStore.getSnapshot,
    markerStore.getServerSnapshot,
  )
  useSyncExternalStore(
    categoryStore.subscribe,
    categoryStore.getSnapshot,
    categoryStore.getServerSnapshot,
  )

  const entries = markerStore.getEntries()
  const entriesByCategory = groupEntriesByCategory(entries)
  const hasMarkers = entries.length > 0
  const hasCategories = categoryStore.getEntries().length > 0
  const selectedCategoryId = categoryStore.getSelectedCategoryId()

  const handleLocation = useCallback(
    (nextLat, nextLng) => {
      if (mode === 'probe') {
        try {
          const data = getProjectExportObject(
            markerStore.toMap(),
            categoryStore.toMap(),
            categoryStore.getSelectedCategoryId(),
          )
          const result = analyzeProbeAt(nextLat, nextLng, data)
          onProbeResult(result)
        } catch {
          onProbeResult(null)
        }
        return
      }
      const catId = categoryStore.getSelectedCategoryId()
      if (catId == null) return
      const cat = categoryStore.getCategoryById(catId)
      if (!cat) return
      markerStore.addEntry(nextLat, nextLng, catId)
    },
    [mode, onProbeResult],
  )

  const isDraw = mode === 'draw'

  return (
    <div className="flex w-full flex-col gap-4">
      {isDraw ? (
        <p className="text-center text-sm text-slate-600">
          OpenStreetMap tiles · markers use the category on the right. Markers
          in the same category connect in ID order (last links back to first) and
          the area is filled with that category’s color.
        </p>
      ) : (
        <p className="text-center text-sm text-slate-600">
          Probe mode uses the same rings as Draw mode. Click the map to see
          whether the point lies inside any category polygon (needs at least
          three markers in that category). Lat/lng are treated as x/y for the
          check.
        </p>
      )}

      {!hasCategories && isDraw && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
          Create a category before you can add markers on the map.
        </p>
      )}
      {hasCategories && selectedCategoryId == null && isDraw && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
          Select an active category in the panel on the right to place markers.
        </p>
      )}
      {!hasCategories && !isDraw && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-700">
          Add categories and markers in Draw mode first — then switch back here
          to probe polygons.
        </p>
      )}

      <div className="h-[min(70vh,560px)] min-h-[280px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          minZoom={2}
          maxZoom={19}
          className="isolate z-0 h-full w-full [&_.leaflet-control]:shadow-md"
          scrollWheelZoom
        >
          <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
          <MapClickCapture onLocation={handleLocation} />
          {[...entriesByCategory.entries()].map(([categoryId, sorted]) => {
            const cat = categoryStore.getCategoryById(categoryId)
            const color = cat?.color ?? FALLBACK_COLOR
            const ring3 = ringPositionsLatLng(sorted)
            if (ring3) {
              return (
                <Polygon
                  key={`ring-${categoryId}`}
                  positions={ring3}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: 0.38,
                    weight: 2,
                    opacity: 0.95,
                    interactive: false,
                  }}
                />
              )
            }
            const ring2 = ringPositionsForTwoPoints(sorted)
            if (ring2) {
              return (
                <Polyline
                  key={`ring-${categoryId}`}
                  positions={ring2}
                  pathOptions={{
                    color,
                    weight: 3,
                    opacity: 0.95,
                    interactive: false,
                  }}
                />
              )
            }
            return null
          })}
          {!isDraw && probeResult && (
            <CircleMarker
              center={[probeResult.lat, probeResult.lng]}
              radius={11}
              pathOptions={{
                color: PROBE_MARKER_COLOR,
                fillColor: PROBE_MARKER_COLOR,
                fillOpacity: 0.35,
                weight: 3,
                bubblingMouseEvents: false,
              }}
            >
              <Popup>
                <div className="min-w-[10rem] font-sans text-sm text-slate-800">
                  <span className="font-medium text-slate-600">Probe point</span>
                  <p className="mt-1 font-mono text-xs tabular-nums">
                    {probeResult.lat.toFixed(6)}, {probeResult.lng.toFixed(6)}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          )}
          {entries.map(([id, { lat, lng, categoryId }]) => {
            const cat = categoryStore.getCategoryById(categoryId)
            const fill = cat?.color ?? FALLBACK_COLOR
            return (
              <CircleMarker
                key={id}
                center={[lat, lng]}
                radius={8}
                pathOptions={{
                  color: fill,
                  fillColor: fill,
                  fillOpacity: 0.9,
                  weight: 2,
                  bubblingMouseEvents: false,
                }}
              >
                <Popup>
                  <div
                    className="flex min-w-[12rem] flex-col gap-2 font-sans"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-xs font-medium text-slate-500">
                      {cat?.name ?? 'Unknown category'} · category {categoryId}
                    </span>
                    <span className="font-mono text-xs text-slate-600">
                      Ring: next → #
                      {markerStore.getNextEntryIdInRing(id) ?? '—'}
                    </span>
                    <span className="font-mono text-sm text-slate-800">
                      marker #{id}: {lat.toFixed(6)}, {lng.toFixed(6)}
                    </span>
                    <button
                      type="button"
                      className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        markerStore.removeEntryById(id)
                      }}
                    >
                      Delete marker
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>

      {!isDraw && hasCategories && !probeResult && (
        <p className="rounded-lg border border-dashed border-sky-300 bg-sky-50/50 px-4 py-3 text-center text-sm text-sky-900">
          Click the map to drop a probe point and see category coverage.
        </p>
      )}

      {!isDraw && probeResult && (
        <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-4 text-left shadow-sm">
          <p className="mb-3 text-sm font-semibold text-sky-900">
            Point check
          </p>
          <p className="mb-2 font-mono text-xs text-slate-700 tabular-nums">
            {probeResult.lat.toFixed(6)}, {probeResult.lng.toFixed(6)}
          </p>
          <p className="mb-3 text-base font-medium text-slate-900">
            {probeResult.insideAnyPolygon && probeResult.categoryName ? (
              <>
                Probe is inside Category:{' '}
                <span className="text-sky-800">{probeResult.categoryName}</span>
              </>
            ) : (
              <span>Probe is not inside any category polygon.</span>
            )}
          </p>
          {probeResult.nearestPoint ? (
            <p className="mb-3 text-sm text-slate-700">
              Nearest marker: #{probeResult.nearestPoint.markerId} ·{' '}
              {categoryStore.getCategoryById(
                probeResult.nearestPoint.categoryId,
              )?.name ?? `category ${probeResult.nearestPoint.categoryId}`}{' '}
              · {probeResult.nearestPoint.distanceMeters.toFixed(2)} m (Haversine)
            </p>
          ) : (
            <p className="mb-3 text-sm text-slate-600">
              No markers in the project — findNearestPoint returns null.
            </p>
          )}
          <p className="whitespace-pre-line text-xs leading-relaxed text-slate-600">
            {renderDescriptionWithBold(probeResult.methodDescription)}
          </p>
        </div>
      )}

      {isDraw && hasMarkers ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm">
          <p className="mb-3 text-sm font-medium text-slate-700">
            Markers ({entries.length})
          </p>
          <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
            {entries.map(([id, { lat, lng, categoryId }]) => {
              const cat = categoryStore.getCategoryById(categoryId)
              return (
                <li
                  key={id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor: cat?.color ?? FALLBACK_COLOR,
                    }}
                  />
                  <span className="min-w-[4rem] font-mono font-medium text-slate-500">
                    #{id}
                  </span>
                  <span className="text-slate-600">{cat?.name ?? '?'}</span>
                  <span className="font-mono tabular-nums text-slate-800">
                    {lat.toFixed(6)}, {lng.toFixed(6)}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : isDraw ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
          {hasCategories && selectedCategoryId != null
            ? 'Click the map to add a marker for the selected category.'
            : 'Add and select a category to place markers.'}
        </p>
      ) : null}
    </div>
  )
}
