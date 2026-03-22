import { markerStore } from './markerStore.js'

function randomHexColor() {
  const bytes = new Uint8Array(3)
  crypto.getRandomValues(bytes)
  return (
    '#' +
    [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
  )
}

class CategoryStore {
  /** @type {Map<number, { id: number; name: string; color: string }>} */
  #categories = new Map()
  #nextId = 1
  /** @type {number | null} */
  #selectedId = null
  #version = 0
  /** @type {Set<() => void>} */
  #listeners = new Set()

  subscribe = (listener) => {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  getSnapshot = () => this.#version

  getServerSnapshot = () => 0

  #emit() {
    this.#version += 1
    this.#listeners.forEach((fn) => fn())
  }

  /** @returns {Array<[number, { id: number; name: string; color: string }]>} */
  getEntries() {
    return [...this.#categories.entries()]
  }

  /** @returns {{ id: number; name: string; color: string } | undefined} */
  getCategoryById(id) {
    return this.#categories.get(id)
  }

  /** @returns {number | null} */
  getSelectedCategoryId() {
    return this.#selectedId
  }

  /**
   * @param {number | null} id
   */
  setSelectedCategoryId(id) {
    if (id !== null && !this.#categories.has(id)) return
    this.#selectedId = id
    this.#emit()
  }

  /**
   * @param {string} name
   * @param {string | undefined} color if undefined, a random color is assigned
   * @returns {number} new category id
   */
  addCategory(name, color) {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Category name is required')

    const id = this.#nextId++
    const resolvedColor = color ?? randomHexColor()
    this.#categories.set(id, { id, name: trimmed, color: resolvedColor })
    if (this.#selectedId === null) this.#selectedId = id
    this.#emit()
    return id
  }

  /**
   * Deletes the category and all markers with this categoryId.
   * @param {number} id
   * @returns {boolean} whether the category existed and was removed
   */
  removeCategoryById(id) {
    if (!this.#categories.has(id)) return false
    markerStore.removeEntriesByCategoryId(id)
    this.#categories.delete(id)
    if (this.#selectedId === id) {
      const sorted = [...this.#categories.keys()].sort((a, b) => a - b)
      this.#selectedId = sorted.length ? sorted[0] : null
    }
    this.#emit()
    return true
  }

  /** @returns {Map<number, { id: number; name: string; color: string }>} */
  toMap() {
    return new Map(this.#categories)
  }

  /**
   * Replace all categories from exported JSON. Does not clear markers — call after or before marker hydrate as needed.
   * @param {Record<string, { id?: number; name?: string; color?: string }>} record
   * @param {number | null | undefined} preferredSelectedId from export, if still valid
   */
  hydrateFromExport(record, preferredSelectedId) {
    this.#categories.clear()
    let maxId = 0
    for (const [key, val] of Object.entries(record)) {
      const id =
        typeof val?.id === 'number' && Number.isFinite(val.id)
          ? val.id
          : Number(key)
      if (!Number.isFinite(id)) continue
      const name =
        typeof val?.name === 'string' ? val.name : String(val?.name ?? '')
      const color =
        typeof val?.color === 'string' ? val.color : String(val?.color ?? '#888888')
      this.#categories.set(id, { id, name, color })
      maxId = Math.max(maxId, id)
    }
    this.#nextId = maxId + 1

    if (
      preferredSelectedId != null &&
      this.#categories.has(preferredSelectedId)
    ) {
      this.#selectedId = preferredSelectedId
    } else {
      const sorted = [...this.#categories.keys()].sort((a, b) => a - b)
      this.#selectedId = sorted.length ? sorted[0] : null
    }
    this.#emit()
  }
}

/** @type {CategoryStore} */
export const categoryStore = new CategoryStore()
