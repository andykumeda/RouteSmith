import { gpx } from '@tmcw/togeojson';

// In browser environment, DOMParser is globally available.
// We'll rely on global DOMParser for parsing.

interface ElevationPoint {
    distance: number;
    elevation: number;
}

export const exportToGpx = (
    routeGeoJson: GeoJSON.FeatureCollection | GeoJSON.Feature<GeoJSON.LineString> | null,
    elevationProfile: ElevationPoint[],
    routeName: string = "Exported Route",
    waypoints: any[] = []
): string => {
    if (!routeGeoJson) return '';

    const lineFeature = routeGeoJson.type === 'FeatureCollection'
        ? (routeGeoJson.features.find(f => f.geometry.type === 'LineString') as GeoJSON.Feature<GeoJSON.LineString>)
        : (routeGeoJson as GeoJSON.Feature<GeoJSON.LineString>);

    if (!lineFeature || !lineFeature.geometry || !lineFeature.geometry.coordinates) {
        return '';
    }

    const coords = lineFeature.geometry.coordinates;

    // header
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TrailNavigatorPro" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${routeName}</name>
    <trkseg>
`;

    // waypoint points
    let wptSection = '';
    waypoints.filter(wp => wp.type === 'poi').forEach(wp => {
        const name = wp.poiType ? wp.poiType.charAt(0).toUpperCase() + wp.poiType.slice(1) : 'Waypoint';
        wptSection += `  <wpt lat="${wp.lat}" lon="${wp.lng}">\n    <name>${name}</name>\n    <sym>${name}</sym>\n  </wpt>\n`;
    });

    // Merge wptSection into Header
    gpx = gpx.replace('<trk>', wptSection + '  <trk>');

    // track points
    // We try to match elevation to coordinates.
    // Ideally we have 1:1 mapping if we fetched elevation for every point.
    // If not, we might skip elevation or interpolate. 
    // For now, we assume simple mapping or just dump coords if length differs largely.

    // In our current implementation, we fetch elevation for ALL coords in segments.
    // However, segments are separate. routeGeoJson is concatenated.
    // Let's assume the order matches.

    // Actually, store keeps elevationProfile with cumulative distance, not aligned by index 1:1 necessarily 
    // depending on how we constructed it.
    // BUT checking useRouteStore: "newElevationProfile = [...currentProfile, ...newElevationPoints];"
    // And "elevations = await getElevationData(segmentCoords)".
    // So usually there is one elevation point per coordinate.

    coords.forEach((coord, index) => {
        const lng = coord[0];
        const lat = coord[1];
        let eleString = '';

        // Try to find elevation. 
        // Note: elevationProfile in store is optimized/mapped.
        // It might not index match exactly if we did any clever sampling.
        // But for now let's check safety.
        if (index < elevationProfile.length) {
            eleString = `<ele>${elevationProfile[index].elevation}</ele>`;
        }

        gpx += `      <trkpt lat="${lat}" lon="${lng}">${eleString}</trkpt>\n`;
    });

    gpx += `    </trkseg>
  </trk>
</gpx>`;

    return gpx;
};

export const parseGpx = async (file: File): Promise<GeoJSON.FeatureCollection | null> => {
    try {
        const text = await file.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        const geoJson = gpx(xmlDoc);
        return geoJson;
    } catch (error) {
        console.error('Error parsing GPX:', error);
        return null;
    }
};
