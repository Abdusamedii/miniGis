import { useCallback, useId, useRef, useState, useSyncExternalStore } from 'react'
import { CategoryPanel } from './components/CategoryPanel.jsx'
import { WorldMap } from './components/WorldMap.jsx'
import { categoryStore } from './services/categoryStore.js'
import { markerStore } from './services/markerStore.js'
import {
  downloadMarkersJSON,
  loadProjectFromJSONString,
} from './utils/markersJson.js'

function App() {
  const fileInputId = `${useId()}-load-json`
  const fileInputRef = useRef(null)
  const [loadError, setLoadError] = useState(null)
  const [mapMode, setMapMode] = useState('draw')
  const [probeResult, setProbeResult] = useState(null)

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

  const saveJSON = useCallback(() => {
    downloadMarkersJSON(markerStore.toMap(), categoryStore.toMap())
  }, [])

  const onLoadFile = useCallback(async (e) => {
    const input = e.target
    const file = input.files?.[0]
    input.value = ''
    if (!file) return
    setLoadError(null)
    try {
      const text = await file.text()
      loadProjectFromJSONString(text)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err))
    }
  }, [])

  return (
    <div className="min-h-dvh flex flex-col px-4 py-8 sm:px-6 lg:py-10">
      <header className="mb-8 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-slate-500">
          miniGis
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Map
        </h1>
        <div
          className="mx-auto mt-6 inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-1 shadow-inner"
          role="group"
          aria-label="Map mode"
        >
          <button
            type="button"
            onClick={() => {
              setMapMode('draw')
              setProbeResult(null)
            }}
            className={`rounded-md px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
              mapMode === 'draw'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Draw
          </button>
          <button
            type="button"
            onClick={() => setMapMode('probe')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
              mapMode === 'probe'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Probe point
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <div className="min-w-0 flex-1">
          <WorldMap
            mode={mapMode}
            probeResult={probeResult}
            onProbeResult={setProbeResult}
          />
        </div>
        <aside className="w-full shrink-0 lg:sticky lg:top-8 lg:w-80 xl:w-96">
          <CategoryPanel />
        </aside>
      </div>

      <div className="mx-auto mt-8 flex w-full max-w-7xl flex-col items-stretch gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-sm text-slate-600">
            Save / load the full project:{' '}
            <code className="rounded bg-slate-200/80 px-1.5 py-0.5 font-mono text-xs text-slate-800">
              categories
            </code>
            ,{' '}
            <code className="rounded bg-slate-200/80 px-1 py-0.5 font-mono text-[11px] text-slate-800">
              markers
            </code>
            ,{' '}
            <code className="rounded bg-slate-200/80 px-1 py-0.5 font-mono text-[11px] text-slate-800">
              selectedCategoryId
            </code>
            , plus version and timestamp.
          </p>
          {loadError && (
            <p className="text-sm text-red-700" role="alert">
              {loadError}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={onLoadFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          >
            Load JSON
          </button>
          <button
            type="button"
            onClick={saveJSON}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          >
            Save JSON
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
