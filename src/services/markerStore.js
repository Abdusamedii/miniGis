class MarkerStore {
  /**
   * @type {Map<number, { lat: number; lng: number; categoryId: number }>}
   */
  #map = new Map()
  #nextId = 1
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

  /** @returns {Array<[number, { lat: number; lng: number; categoryId: number }]>} */
  getEntries() {
    return [...this.#map.entries()]
  }

  /**
   * Entries for one category, sorted by marker id (ascending).
   * Ring order: id₀ → id₁ → … → idₙ → back to id₀.
   * @param {number} categoryId
   * @returns {Array<[number, { lat: number; lng: number; categoryId: number }]>}
   */
  getEntriesByCategoryId(categoryId) {
    return [...this.#map.entries()]
      .filter(([, e]) => e.categoryId === categoryId)
      .sort((a, b) => a[0] - b[0])
  }

  /**
   * Next marker id in the cyclic ring for this entry’s category (last → first).
   * @param {number} entryId
   * @returns {number | null}
   */
  getNextEntryIdInRing(entryId) {
    const entry = this.#map.get(entryId)
    if (!entry) return null
    const ring = this.getEntriesByCategoryId(entry.categoryId).map(([id]) => id)
    if (ring.length < 2) return null
    const idx = ring.indexOf(entryId)
    if (idx === -1) return null
    return ring[(idx + 1) % ring.length]
  }

  /** @returns {{ lat: number; lng: number; categoryId: number } | undefined} */
  getEntryById(id) {
    return this.#map.get(id)
  }

  /**
   * @param {number} lat
   * @param {number} lng
   * @param {number} categoryId
   * @returns {number | null} assigned id, or null if categoryId is invalid
   */
  addEntry(lat, lng, categoryId) {
    const id = this.#nextId++
    this.#map.set(id, { lat, lng, categoryId })
    this.#emit()
    return id
  }

  /**
   * @param {number} id
   * @returns {boolean} whether an entry was removed
   */
  removeEntryById(id) {
    const removed = this.#map.delete(id)
    if (removed) this.#emit()
    return removed
  }

  /**
   * Remove every marker belonging to a category (e.g. when the category is deleted).
   * @param {number} categoryId
   * @returns {number} how many markers were removed
   */
  removeEntriesByCategoryId(categoryId) {
    let removed = 0
    for (const [id, e] of [...this.#map.entries()]) {
      if (e.categoryId === categoryId) {
        this.#map.delete(id)
        removed += 1
      }
    }
    if (removed) this.#emit()
    return removed
  }

  /**
   * @returns {Map<number, { lat: number; lng: number; categoryId: number }>}
   */
  toMap() {
    return new Map(this.#map)
  }

  /**
   * Replace all markers from exported JSON.
   * @param {Record<string, { id?: number; categoryId?: number; coords?: { lat?: number; lng?: number } }>} record
   * @param {(categoryId: number) => boolean} hasCategory
   */
  hydrateFromExport(record, hasCategory) {
    this.#map.clear()
    let maxId = 0
    for (const [key, val] of Object.entries(record)) {
      const id =
        typeof val?.id === 'number' && Number.isFinite(val.id)
          ? val.id
          : Number(key)
      if (!Number.isFinite(id)) continue
      const categoryId = val?.categoryId
      const lat = val?.coords?.lat
      const lng = val?.coords?.lng
      if (!Number.isFinite(categoryId) || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        continue
      }
      if (!hasCategory(categoryId)) {
        throw new Error(
          `Marker #${id} references unknown categoryId ${categoryId}`,
        )
      }
      this.#map.set(id, { lat, lng, categoryId })
      maxId = Math.max(maxId, id)
    }
    this.#nextId = maxId + 1
    this.#emit()
  }
}

/** @type {MarkerStore} */
export const markerStore = new MarkerStore()
