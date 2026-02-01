import { point } from '@turf/helpers';
import distance from '@turf/distance';
import along from '@turf/along';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import length from '@turf/length';

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const from = point([lon1, lat1]);
    const to = point([lon2, lat2]);
    const options = { units: 'meters' as const };
    return distance(from, to, options);
};

export const getCoordinateAtDistance = (
    geojson: GeoJSON.FeatureCollection | GeoJSON.Feature<GeoJSON.LineString> | null,
    distMeters: number
): [number, number] | null => {
    if (!geojson) return null;
    const lineFeature = geojson.type === 'FeatureCollection'
        ? (geojson.features.find(f => f.geometry.type === 'LineString') as GeoJSON.Feature<GeoJSON.LineString>)
        : (geojson as GeoJSON.Feature<GeoJSON.LineString>);

    if (!lineFeature) return null;
    try {
        const distKm = distMeters / 1000;
        const total = length(lineFeature, { units: 'kilometers' });
        const target = Math.max(0, Math.min(distKm, total));
        const p = along(lineFeature, target, { units: 'kilometers' });
        return p.geometry.coordinates as [number, number];
    } catch (e) {
        return null;
    }
};

export const getDistanceAtCoordinate = (
    geojson: GeoJSON.FeatureCollection | GeoJSON.Feature<GeoJSON.LineString> | null,
    lng: number,
    lat: number
): number | null => {
    if (!geojson) return null;
    const lineFeature = geojson.type === 'FeatureCollection'
        ? (geojson.features.find(f => f.geometry.type === 'LineString') as GeoJSON.Feature<GeoJSON.LineString>)
        : (geojson as GeoJSON.Feature<GeoJSON.LineString>);

    if (!lineFeature) return null;
    try {
        const p = point([lng, lat]);
        const snapped = nearestPointOnLine(lineFeature, p, { units: 'kilometers' });

        // snapped.properties.location is distance along line in km (if properly supported by the version, usually 'location' property)
        // types for turf nearestPointOnLine return NearestPointOnLine which extends Feature<Point, Properties>
        // The properties include 'location' (distance along line in specified units) and 'dist' (distance from point to line)

        const distKm = snapped.properties?.location;
        if (typeof distKm === 'number') {
            return distKm * 1000; // convert to meters
        }
        return null;
    } catch (e) {
        console.error('Error in getDistanceAtCoordinate', e);
        return null;
    }
};
