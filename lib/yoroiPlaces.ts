import { NativeModules, Platform } from 'react-native';

const { YoroiPlacesModule } = NativeModules;

export interface PlaceSuggestion {
  name: string;
  address: string;
  lat: number;
  lon: number;
}

/**
 * Recherche de lieux via MKLocalSearch (Apple Maps natif) sur iOS.
 * Passer regionLat/regionLon pour biaiser les résultats vers une zone géographique.
 */
export async function searchPlacesNative(
  query: string,
  regionLat = 0,
  regionLon = 0
): Promise<PlaceSuggestion[]> {
  if (Platform.OS !== 'ios' || !YoroiPlacesModule?.searchPlaces) {
    return [];
  }
  try {
    const jsonString: string = await YoroiPlacesModule.searchPlaces(query, regionLat, regionLon);
    return JSON.parse(jsonString) as PlaceSuggestion[];
  } catch {
    return [];
  }
}

export const isNativePlacesAvailable =
  Platform.OS === 'ios' && !!NativeModules.YoroiPlacesModule;
