import { gpx } from '@tmcw/togeojson';

// In browser environment, DOMParser is globally available.
// We'll rely on global DOMParser for parsing.

interface ElevationPoint {
    distance: number;
    elevation: number;
}

const escapeXml = (unsafe: string): string => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
};

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
    const escapedRouteName = escapeXml(routeName || "Exported Route");

    // Header with full schema validation for maximum compatibility
    let gpxText = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TrailNavPro" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
`;

    // Waypoint points (wpt) - only export meaningful waypoints
    console.log('[GPX Export] Total waypoints:', waypoints.length);
    waypoints.forEach((wp, index) => {
        console.log(`[GPX Export] Waypoint ${index}:`, { type: wp.type, poiType: wp.poiType, lat: wp.lat, lng: wp.lng });

        if (!wp.lat || !wp.lng) return;

        // Skip intermediate routing waypoints (type='route') - they're just for path calculation
        // Only export start, end, and POI waypoints
        if (wp.type === 'route') {
            console.log(`[GPX Export] Skipping routing waypoint ${index}`);
            return;
        }

        let label = 'Waypoint';
        if (wp.type === 'start') label = 'Start';
        else if (wp.type === 'end') label = 'Finish';
        else if (wp.type === 'poi') {
            label = wp.poiType ? wp.poiType.charAt(0).toUpperCase() + wp.poiType.slice(1) : 'POI';
        } else {
            label = `Point ${index + 1}`;
        }

        const escapedLabel = escapeXml(label);

        gpxText += `  <wpt lat="${wp.lat}" lon="${wp.lng}">
    <name>${escapedLabel}</name>
`;
        if (wp.elevation) {
            gpxText += `    <ele>${wp.elevation}</ele>
`;
        }

        // Add comment if present
        if (wp.comment) {
            const escapedComment = escapeXml(wp.comment);
            gpxText += `    <cmt>${escapedComment}</cmt>
`;
        }

        gpxText += `  </wpt>
`;
    });

    // Track
    gpxText += `  <trk>
    <name>${escapedRouteName}</name>
    <trkseg>
`;

    // Track points
    coords.forEach((coord, index) => {
        const lng = coord[0];
        const lat = coord[1];
        // Elevation: use profile if available, fallback to coordinate[2] if present
        const ele = (index < elevationProfile.length) ? elevationProfile[index].elevation : (coord[2] || null);

        gpxText += `      <trkpt lat="${lat}" lon="${lng}">`;
        if (ele !== null) {
            gpxText += `
        <ele>${ele}</ele>
      `;
        }
        gpxText += `</trkpt>
`;
    });

    gpxText += `    </trkseg>
  </trk>
</gpx>`;

    return gpxText;
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
