interface DirectionsResponse {
    routes: {
        geometry: GeoJSON.LineString;
        distance: number;
        duration: number;
        legs: {
            annotation?: {
                distance: number[];
            };
        }[];
    }[];
}

export const getDirections = async (
    start: [number, number],
    end: [number, number],
    profile: 'walking' | 'cycling' | 'driving' = 'walking'
): Promise<{ geometry: GeoJSON.LineString; distance: number; elevationProfile?: { distance: number; elevation: number }[] } | null> => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) {
        console.error('Mapbox token missing');
        return null;
    }

    // Requesting annotations for distance only
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&annotations=distance&access_token=${token}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Mapbox API error: ${response.statusText}`);
        }
        const data: DirectionsResponse = await response.json();

        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            return {
                geometry: route.geometry,
                distance: route.distance,
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching directions:', error);
        return null;
    }
};

interface ElevationResponse {
    elevation: number[];
}

export const getElevationData = async (coordinates: number[][]): Promise<number[]> => {
    // Coordinates are [lng, lat]
    // Open-Meteo expects lat,lng arrays
    // We should sample coordinates to avoid URL length limits and excessive data
    // Limit to ~100 points max for the graph

    if (coordinates.length === 0) return [];

    const step = Math.ceil(coordinates.length / 100) || 1;
    const sampledCoords = coordinates.filter((_, i) => i % step === 0);

    const lats = sampledCoords.map(c => c[1].toFixed(6)).join(',');
    const lngs = sampledCoords.map(c => c[0].toFixed(6)).join(',');

    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error('Elevation API error:', response.statusText);
            return [];
        }
        const data: ElevationResponse = await response.json();

        // If we sampled, we might want to interpolate back? 
        // For MVP, we will just return the sampled elevation which might be shorter than coords.
        // However, the caller expects to map 1:1 or logic will break if we don't handle it.
        // In useRouteStore, we map: "const percent = i / (elevations.length - 1 || 1);"
        // This implies we distrubute the points evenly along the segment. 
        // This is "ok" for visualization but not perfectly accurate.

        return data.elevation || [];
    } catch (error) {
        console.error('Error fetching elevation:', error);
        return [];
    }
};

interface GeocodingResponse {
    features: {
        text: string;
        place_name: string;
        place_type: string[];
        context?: { text: string }[];
    }[];
}

export const getPlaceName = async (lng: number, lat: number): Promise<string | null> => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return null;

    // We look for 'place' (city/town) or 'locality'
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,locality,neighborhood&access_token=${token}`;

    try {
        const response = await fetch(url);
        if (!response.ok) return null;

        const data: GeocodingResponse = await response.json();

        if (data.features && data.features.length > 0) {
            return data.features[0].text; // e.g., "San Francisco"
        }
        return null;
    } catch (error) {
        console.error('Error fetching place name:', error);
        return null;
    }
};
