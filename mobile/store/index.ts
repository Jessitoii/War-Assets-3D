import { create } from 'zustand';
import { AppState, createAppSlice } from './slices/appSlice';
import { OnboardingState, createOnboardingSlice } from './slices/onboardingSlice';
import { AssetState, createAssetSlice } from './slices/assetSlice';
import { FilterState, createFilterSlice } from './slices/filterSlice';

// Combine slices
export type StoreState = AppState & { onboarding: OnboardingState } & AssetState & FilterState;


export const useStore = create<StoreState>()((set, get, api) => ({
  ...createAppSlice(set),
  ...createAssetSlice(set, get),
  ...createFilterSlice(set),
  onboarding: createOnboardingSlice((fn: any) => set((state: any) => ({ onboarding: fn(state.onboarding) }))),
}));

// Memoized Selectors Strategy
export const selectTheme = (state: StoreState) => state.theme;
export const selectFirstLaunch = (state: StoreState) => state.firstLaunch;
export const selectOnboardingContent = (state: StoreState) => state.onboarding.content;
export const selectOnboardingCurrentPage = (state: StoreState) => state.onboarding.currentPage;

// These return new references, so MUST be used with `useShallow` or memoized
export const selectAssets = (state: StoreState) => state.assets;
export const selectCategories = (state: StoreState) => state.categories;
export const selectFeaturedAssets = (state: StoreState) => {
  const featured = state.assets.filter(a => a.isFeatured);
  if (featured.length > 0) return featured;
  // Fallback: Top 10 by danger level
  return [...state.assets]
    .sort((a, b) => (b.dangerLevel || 0) - (a.dangerLevel || 0))
    .slice(0, 10);
};

export const selectTrendingAssets = (state: StoreState) => {
  if (state.trendingAssets && state.trendingAssets.length > 0) {
    return state.trendingAssets;
  }
  // Fallback if sync not done or failed
  return [...state.assets]
    .sort((a, b) => (b.dangerLevel || 0) - (a.dangerLevel || 0))
    .slice(0, 5);
};
