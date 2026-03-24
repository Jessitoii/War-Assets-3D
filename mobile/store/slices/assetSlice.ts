import { dbHelper } from '../../scripts/init-db';
import { XMLParser } from 'fast-xml-parser';

export interface AssetSpecs {
  range: string;
  speed: string;
  generation: string;
  country: string;
  [key: string]: string | undefined;
}

export interface Translation {
  name: string;
  country?: string;
  countryCode?: string;
  specs: Partial<AssetSpecs>;
  short_specs?: Partial<AssetSpecs>;
  full_dossier?: Partial<AssetSpecs>;
}

export interface AssetMetrics {
  firepower: number;
  durability: number;
  mobility: number;
  stealth: number;
}

export interface Asset {
  id: string;
  name: string;
  categoryId: string;
  isFeatured: boolean;
  image?: string;
  images?: string[];
  specs?: AssetSpecs;
  short_specs?: AssetSpecs;
  full_dossier?: AssetSpecs;
  model?: string;
  metrics?: AssetMetrics;
  hasModel?: boolean;
  dangerLevel?: number;
  threatType?: string;
  wikiUrl?: string;
  country?: string;
  countryCode?: string;
  translations?: {
    tr?: Translation;
    ru?: Translation;
    ar?: Translation;
    zh?: Translation;
    [key: string]: Translation | undefined;
  };
  trendingReason?: string;
  newsUrl?: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
}

export interface AssetState {
  assets: Asset[];
  categories: Category[];
  favorites: string[];
  comparisonQueue: string[];
  trendingAssets: Asset[];
  isTrendingSyncDone: boolean;
  setAssets: (assets: Asset[]) => void;
  setCategories: (categories: Category[]) => void;
  toggleFavorite: (assetId: string) => void;
  setFavorites: (favorites: string[]) => void;
  addToComparison: (assetId: string) => void;
  removeFromComparison: (assetId: string) => void;
  clearComparison: () => void;
  setComparisonQueue: (assetIds: string[]) => void;
  setTrendingAssets: (assets: Asset[]) => void;
  syncTrendingAssets: () => Promise<void>;
}

export const createAssetSlice = (set: any, get: any): AssetState => ({
  assets: [],
  categories: [],
  favorites: [],
  comparisonQueue: [],
  trendingAssets: [],
  isTrendingSyncDone: false,
  setAssets: (assets) => set((state: any) => {
    console.log('[Store] 💾 Saving assets to state...');
    console.log('[Store] Total Assets:', assets.length);
    console.log('[Store] First Asset Example:', assets[0]?.name, 'ID:', assets[0]?.id);
    console.log('[Store] Does first asset have translations?', assets[0]?.translations ? 'Yes' : 'No');
    console.log('[Store] First Asset Translations Type:', typeof assets[0]?.translations);
    return { ...state, assets };
  }),
  setCategories: (categories) => set((state: any) => ({ ...state, categories })),
  setFavorites: (favorites) => set((state: any) => ({ ...state, favorites })),
  toggleFavorite: (assetId) => set((state: any) => {
    const isFavorite = state.favorites.includes(assetId);
    if (isFavorite) {
      dbHelper.removeFromFavorites(assetId).catch(e => console.error('Failed to remove from favorites:', e));
    } else {
      dbHelper.addToFavorites(assetId).catch(e => console.error('Failed to add to favorites:', e));
    }
    return {
      ...state,
      favorites: isFavorite
        ? state.favorites.filter((id: string) => id !== assetId)
        : [...state.favorites, assetId]
    };
  }),
  addToComparison: (assetId) => set((state: any) => {
    if (state.comparisonQueue.length >= 3) return state;
    if (state.comparisonQueue.includes(assetId)) return state;

    // Persist to SQLite
    dbHelper.addToComparison(assetId).catch(e => console.error('Failed to add to comparison_queue:', e));

    return { ...state, comparisonQueue: [...state.comparisonQueue, assetId] };
  }),
  removeFromComparison: (assetId) => set((state: any) => {
    // Persist to SQLite
    dbHelper.removeFromComparison(assetId).catch(e => console.error('Failed to remove from comparison_queue:', e));

    return {
      ...state,
      comparisonQueue: state.comparisonQueue.filter((id: string) => id !== assetId)
    };
  }),
  clearComparison: () => set((state: any) => {
    // Persist to SQLite
    dbHelper.clearComparison().catch(e => console.error('Failed to clear comparison_queue:', e));

    return { ...state, comparisonQueue: [] };
  }),
  setComparisonQueue: (comparisonQueue) => set((state: any) => ({ ...state, comparisonQueue })),
  setTrendingAssets: (trendingAssets) => set((state: any) => ({ ...state, trendingAssets })),
  syncTrendingAssets: async () => {
    const { isTrendingSyncDone, assets, setTrendingAssets } = get();
    if (isTrendingSyncDone || assets.length === 0) return;

    console.log('[Trending] 📡 Synchronizing OSINT feed...');
    try {
      const RSS_URL = 'https://news.google.com/rss/search?q=military+defense+tanks+war+jets+missiles&hl=en-US&gl=US&ceid=US:en';
      const response = await fetch(RSS_URL);
      const xmlData = await response.text();

      const parser = new XMLParser();
      const jsonObj = parser.parse(xmlData);
      const items = jsonObj.rss?.channel?.item || [];
      const latestItems = items.slice(0, 30);

      const trendingMatches: Asset[] = [];
      const seenAssetIds = new Set<string>();

      for (const item of latestItems) {
        const title = item.title || '';
        const link = item.link || '';

        let bestMatch: Asset | null = null;
        let longestMatchLength = 0;

        // Optimized matching: Only check assets if title contains keywords
        // For simplicity and accuracy as per requirements:
        for (const asset of assets) {
          const assetName = asset.name.toLowerCase();
          if (title.toLowerCase().includes(assetName)) {
            if (assetName.length > longestMatchLength) {
              longestMatchLength = assetName.length;
              bestMatch = { ...asset, trendingReason: title, newsUrl: link };
            }
          }
        }

        if (bestMatch && !seenAssetIds.has(bestMatch.id)) {
          trendingMatches.push(bestMatch);
          seenAssetIds.add(bestMatch.id);
        }

        if (trendingMatches.length >= 8) break;
      }

      if (trendingMatches.length > 0) {
        console.log(`[Trending] Found ${trendingMatches.length} live matches.`);
        setTrendingAssets(trendingMatches);
      } else {
        console.log('[Trending] No live matches found. Falling back to featured assets.');
        const featured = assets.filter((a: Asset) => a.isFeatured).slice(0, 5);
        setTrendingAssets(featured);
      }

      set((state: any) => ({ ...state, isTrendingSyncDone: true }));
    } catch (error) {
      console.error('[Trending] Synchronization failed:', error);
      // Fallback
      const featured = assets.filter((a: Asset) => a.isFeatured).slice(0, 5);
      setTrendingAssets(featured);
    }
  },
});
