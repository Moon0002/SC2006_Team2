'use client'

import { create } from 'zustand'

/**
 * Shared store ROI results so the list view (TopStoresROI) and map view
 * (ROIMapVisualizer) stay in sync without recalculating twice.
 */
export const useStoreRoiStore = create((set) => ({
  storeROIs: [],
  setStoreROIs: (nextStoreROIs) => set({ storeROIs: nextStoreROIs || [] }),
  clearStoreROIs: () => set({ storeROIs: [] }),
}))

