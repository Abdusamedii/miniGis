import {
  checkIfInAnyPolygon,
  findFirstCategoryContainingPoint,
  findNearestPoint,
  parseMiniGisExport,
} from 'mini-gis-geo'

let data = null

const fileEl = document.getElementById('file')
const sampleEl = document.getElementById('sample')
const loadStatus = document.getElementById('loadStatus')
const xEl = document.getElementById('x')
const yEl = document.getElementById('y')
const runEl = document.getElementById('run')
const outEl = document.getElementById('out')
const dataWhereEl = document.getElementById('dataWhere')

function exportLatLngBounds(data) {
  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity
  for (const val of Object.values(data.markers)) {
    if (val === null || typeof val !== 'object') continue
    const lat = val.coords?.lat
    const lng = val.coords?.lng
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
  }
  if (!Number.isFinite(minLat)) return null
  return { minLat, maxLat, minLng, maxLng }
}

function formatDataWhere(data) {
  const b = exportLatLngBounds(data)
  if (!b) {
    dataWhereEl.textContent = ''
    return
  }
  const midLat = (b.minLat + b.maxLat) / 2
  const midLng = (b.minLng + b.maxLng) / 2
  const osm = `https://www.openstreetmap.org/?mlat=${midLat}&mlon=${midLng}#map=6/${midLat}/${midLng}`
  dataWhereEl.innerHTML = [
    '<strong>Where this JSON lives (WGS84 °):</strong> ',
    `lat <code>${b.minLat}</code>…<code>${b.maxLat}</code>, `,
    `lng <code>${b.minLng}</code>…<code>${b.maxLng}</code>. `,
    `Your test point must use the <em>same</em> numbers (decimal degrees). `,
    `<a href="${osm}" target="_blank" rel="noopener">Open rough area on OSM</a>.`,
  ].join('')
}

function setLoaded(msg) {
  loadStatus.textContent = msg
}

fileEl.addEventListener('change', async () => {
  const file = fileEl.files?.[0]
  fileEl.value = ''
  if (!file) return
  try {
    const text = await file.text()
    data = parseMiniGisExport(text)
    setLoaded(`Loaded: ${file.name} (${Object.keys(data.markers).length} markers).`)
    formatDataWhere(data)
  } catch (err) {
    data = null
    setLoaded(err instanceof Error ? err.message : String(err))
    dataWhereEl.textContent = ''
  }
})

sampleEl.addEventListener('click', async () => {
  try {
    const res = await fetch('/sample-export.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    data = parseMiniGisExport(text)
    setLoaded('Loaded bundled sample-export.json')
    formatDataWhere(data)
  } catch (err) {
    data = null
    setLoaded(err instanceof Error ? err.message : String(err))
    dataWhereEl.textContent = ''
  }
})

runEl.addEventListener('click', () => {
  if (!data) {
    outEl.textContent = 'Load JSON first (file or bundled sample).'
    return
  }
  const lng = Number(xEl.value)
  const lat = Number(yEl.value)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    outEl.textContent = 'Enter numeric x and y.'
    return
  }

  const inside = checkIfInAnyPolygon(lat, lng, data)
  const firstId = findFirstCategoryContainingPoint(lat, lng, data)
  const nearest = findNearestPoint(lat, lng, data)
  const zoneName =
    firstId != null ? data.categories[String(firstId)]?.name ?? '(unnamed)' : null

  const b = exportLatLngBounds(data)
  const inBbox =
    b &&
    lat >= b.minLat &&
    lat <= b.maxLat &&
    lng >= b.minLng &&
    lng <= b.maxLng

  outEl.textContent = [
    b
      ? `Marker bbox: lat [${b.minLat}, ${b.maxLat}], lng [${b.minLng}, ${b.maxLng}] — test point in axis-aligned box: ${inBbox}`
      : '(no marker coords)',
    '',
    `checkIfInAnyPolygon(lat=${lat}, lng=${lng}) → ${inside}`,
    `findFirstCategoryContainingPoint → ${firstId === null ? 'null' : firstId} (${zoneName})`,
    `findNearestPoint → ${
      nearest === null
        ? 'null'
        : JSON.stringify(
            {
              markerId: nearest.markerId,
              categoryId: nearest.categoryId,
              distanceMeters: Number(nearest.distanceMeters.toFixed(2)),
            },
            null,
            2,
          )
    }`,
  ].join('\n')
})
