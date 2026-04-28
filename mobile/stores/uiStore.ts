import { create } from "zustand";

export interface ListingFilters {
  city?: string;
  price_min?: number;
  price_max?: number;
  room_type?: string;
  property_type?: string;
  available_from?: string;
  utilities_included?: boolean;
  min_trust?: number;
  sort_by?: string;
}

interface UIState {
  theme: "light" | "dark";
  onboardingComplete: boolean;
  listingViewMode: "list" | "map";
  listingFilters: ListingFilters;
  compareIds: string[];
  apiWarning: string | null;

  setTheme: (theme: "light" | "dark") => void;
  completeOnboarding: () => void;
  setListingViewMode: (mode: "list" | "map") => void;
  setListingFilters: (filters: ListingFilters) => void;
  updateFilter: <K extends keyof ListingFilters>(key: K, value: ListingFilters[K]) => void;
  clearFilters: () => void;
  clearFilter: (key: keyof ListingFilters) => void;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  setApiWarning: (message: string | null) => void;
}

const EMPTY_FILTERS: ListingFilters = {};

export const useUIStore = create<UIState>((set) => ({
  theme: "light",
  onboardingComplete: false,
  listingViewMode: "list",
  listingFilters: {},
  compareIds: [],
  apiWarning: null,

  setTheme: (theme) => set({ theme }),
  completeOnboarding: () => set({ onboardingComplete: true }),
  setListingViewMode: (mode) => set({ listingViewMode: mode }),
  setListingFilters: (filters) => set({ listingFilters: filters }),
  updateFilter: (key, value) =>
    set((state) => ({
      listingFilters: { ...state.listingFilters, [key]: value },
    })),
  clearFilters: () => set({ listingFilters: EMPTY_FILTERS }),
  clearFilter: (key) =>
    set((state) => {
      const next = { ...state.listingFilters };
      delete next[key];
      return { listingFilters: next };
    }),
  toggleCompare: (id) =>
    set((state) => {
      const has = state.compareIds.includes(id);
      return {
        compareIds: has
          ? state.compareIds.filter((x) => x !== id)
          : [...state.compareIds, id].slice(0, 4),
      };
    }),
  clearCompare: () => set({ compareIds: [] }),
  setApiWarning: (message) => set({ apiWarning: message }),
}));
