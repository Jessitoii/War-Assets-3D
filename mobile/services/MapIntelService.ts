import { Asset } from '../store/slices/assetSlice';

export interface TacticalPoint {
  id: string;
  lat: number;
  lng: number;
  locationName: string;
  newsTitle: string;
  relatedAssetId?: string;
}

export interface Hotspot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  keywords: string[];
}

export const MapIntelService = {
  /**
   * Deterministically links RSS news items to tactical hotspots and assets.
   * Optimized for execution. 
   * @param rssItems List of RSS news items (parsed from XML)
   * @param hotspots List of hotspots from hotspots.json
   * @param assets List of assets from the database
   */
  getTacticalPoints(rssItems: any[], hotspots: Hotspot[], assets: Asset[]): TacticalPoint[] {
    const points: TacticalPoint[] = [];
    const processedTitles = new Set<string>();

    rssItems.forEach((item, index) => {
      const title = item.title || '';
      if (processedTitles.has(title)) return;

      const lowerTitle = title.toLowerCase();

      // 1. Scan title for hotspot keywords
      const matchedHotspot = hotspots.find(hotspot => 
        hotspot.keywords.some(keyword => 
          lowerTitle.includes(keyword.toLowerCase())
        )
      );

      if (matchedHotspot) {
        // 2. Scan same title for asset name
        let bestAssetMatch: Asset | null = null;
        let longestMatchLength = 0;

        for (let i = 0; i < assets.length; i++) {
          const assetNameLower = assets[i].name.toLowerCase();
          if (lowerTitle.includes(assetNameLower)) {
             if (assetNameLower.length > longestMatchLength) {
               longestMatchLength = assetNameLower.length;
               bestAssetMatch = assets[i];
             }
          }
        }

        points.push({
          id: `tp-${index}-${matchedHotspot.id}`,
          lat: matchedHotspot.lat,
          lng: matchedHotspot.lng,
          locationName: matchedHotspot.name,
          newsTitle: title,
          relatedAssetId: bestAssetMatch ? (bestAssetMatch as Asset).id : undefined
        });

        processedTitles.add(title);
      }
    });

    return points;
  }
};
