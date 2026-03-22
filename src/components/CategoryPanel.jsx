import { useCallback, useId, useState, useSyncExternalStore } from 'react'
import { categoryStore } from '../services/categoryStore.js'
import { markerStore } from '../services/markerStore.js'

export function CategoryPanel() {
  useSyncExternalStore(
    categoryStore.subscribe,
    categoryStore.getSnapshot,
    categoryStore.getServerSnapshot,
  )
  useSyncExternalStore(
    markerStore.subscribe,
    markerStore.getSnapshot,
    markerStore.getServerSnapshot,
  )

  const idPrefix = useId()
  const nameId = `${idPrefix}-name`
  const colorId = `${idPrefix}-color`
  const selectId = `${idPrefix}-select`

  const categories = categoryStore.getEntries()
  const selectedId = categoryStore.getSelectedCategoryId()

  const [name, setName] = useState('')
  const [useRandomColor, setUseRandomColor] = useState(false)
  const [pickedColor, setPickedColor] = useState('#6366f1')

  const handleAddCategory = useCallback(
    (e) => {
      e.preventDefault()
      try {
        const newId = categoryStore.addCategory(
          name,
          useRandomColor ? undefined : pickedColor,
        )
        categoryStore.setSelectedCategoryId(newId)
        setName('')
      } catch {
        /* empty name */
      }
    },
    [name, useRandomColor, pickedColor],
  )

  return (
    <div className="flex w-full flex-col gap-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Categories</h2>
        <p className="mt-1 text-sm text-slate-600">
          Create a category first, then pick it for new map markers. Deleting a
          category removes all of its markers from the map.
        </p>
      </div>

      <div>
        <label
          htmlFor={selectId}
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Active category (new markers)
        </label>
        <select
          id={selectId}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          value={selectedId ?? ''}
          disabled={categories.length === 0}
          onChange={(e) => {
            const v = e.target.value
            categoryStore.setSelectedCategoryId(v === '' ? null : Number(v))
          }}
        >
          {categories.length === 0 ? (
            <option value="">No categories yet</option>
          ) : (
            categories.map(([id, cat]) => (
              <option key={id} value={id}>
                {cat.name} (#{id})
              </option>
            ))
          )}
        </select>
      </div>

      <form className="flex flex-col gap-3" onSubmit={handleAddCategory}>
        <p className="text-sm font-medium text-slate-700">New category</p>
        <div>
          <label htmlFor={nameId} className="sr-only">
            Name
          </label>
          <input
            id={nameId}
            type="text"
            required
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={useRandomColor}
              onChange={(e) => setUseRandomColor(e.target.checked)}
              className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
            />
            Random color
          </label>
          {!useRandomColor && (
            <div className="flex items-center gap-2">
              <label htmlFor={colorId} className="text-sm text-slate-600">
                Color
              </label>
              <input
                id={colorId}
                type="color"
                value={pickedColor}
                onChange={(e) => setPickedColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border border-slate-300 bg-white"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          Add category
        </button>
      </form>

      {categories.length > 0 && (
        <ul className="space-y-2 border-t border-slate-100 pt-4">
          {categories.map(([id, cat]) => {
            const markerCount = markerStore.getEntriesByCategoryId(id).length
            return (
              <li
                key={id}
                className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full ring-2 ring-white ring-offset-1"
                  style={{ backgroundColor: cat.color }}
                  title={cat.color}
                />
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-slate-800">{cat.name}</span>
                  <span className="ml-2 font-mono text-xs text-slate-500">
                    #{id} · {markerCount} marker{markerCount === 1 ? '' : 's'}
                  </span>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
                  onClick={() => {
                    const msg =
                      markerCount > 0
                        ? `Delete category "${cat.name}" and its ${markerCount} map marker${markerCount === 1 ? '' : 's'}?`
                        : `Delete category "${cat.name}"?`
                    if (globalThis.confirm?.(msg)) {
                      categoryStore.removeCategoryById(id)
                    }
                  }}
                >
                  Delete
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
