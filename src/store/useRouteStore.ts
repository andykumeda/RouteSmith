import { create } from 'zustand';
import { getDirections, getElevationData, getPlaceName } from '../lib/mapboxUtils';
import { calculateDistance } from '../lib/geoUtils';

export interface Waypoint {
    id: string;
    lng: number;
    lat: number;
    elevation?: number;
    type: 'start' | 'end' | 'route' | 'poi'; // Visual type
}

interface Segment {
    id: string;
    geometry: GeoJSON.LineString;
    distance: number;
    elevationProfile?: { distance: number; elevation: number }[];
}

interface ElevationPoint {
    distance: number; // Cumulative distance from start
    elevation: number;
}

interface RouteState {
    waypoints: Waypoint[];
    segments: Segment[];
    routeGeoJson: GeoJSON.Feature<GeoJSON.LineString> | null;
    totalDistance: number;
    totalElevationGain: number; // Track total gain
    elevationProfile: ElevationPoint[];
    isFetching: boolean;
    shouldFitBounds: boolean;
    routeName: string;
    routeId: string | null; // Track loaded/saved route ID
    hoveredDistance: number | null;
    isReadOnly: boolean;
    isManualMode: boolean;

    addWaypoint: (lng: number, lat: number) => Promise<void>;
    removeWaypoint: (id: string) => void;
    undoLastWaypoint: () => void;
    clearRoute: () => void;
    setRouteFromImport: (featureCollection: GeoJSON.FeatureCollection) => void;
    setShouldFitBounds: (should: boolean) => void;
    setRouteName: (name: string) => void;
    setRouteId: (id: string | null) => void;
    setHoveredDistance: (dist: number | null) => void;
    setReadOnly: (readonly: boolean) => void;
    setManualMode: (manual: boolean) => void;
}

export const useRouteStore = create<RouteState>((set, get) => ({
    waypoints: [],
    segments: [],
    routeGeoJson: null,
    totalDistance: 0,
    totalElevationGain: 0,
    elevationProfile: [],
    isFetching: false,
    shouldFitBounds: false,
    routeName: "New Route",
    routeId: null,
    hoveredDistance: null,
    isReadOnly: false,
    isManualMode: false,

    setReadOnly: (readonly) => set({ isReadOnly: readonly }),
    setManualMode: (manual) => set({ isManualMode: manual }),
    setRouteName: (name) => set({ routeName: name }),
    setRouteId: (id) => set({ routeId: id }),
    setHoveredDistance: (dist) => set({ hoveredDistance: dist }),

    addWaypoint: async (lng, lat) => {
        const { waypoints, segments, routeName, isReadOnly, isManualMode } = get();

        if (isReadOnly) return;

        // Auto-name for first point if name is generic
        if (waypoints.length === 0 && (routeName === "New Route" || routeName === "")) {
            // Fire and forget - don't block
            getPlaceName(lng, lat).then(name => {
                if (name) {
                    set({ routeName: `Route near ${name}` });
                }
            });
        }

        const newWaypoint: Waypoint = {
            id: crypto.randomUUID(),
            lng,
            lat,
            type: waypoints.length === 0 ? 'start' : 'end'
        };

        // If it's the first point, just add it
        if (waypoints.length === 0) {
            set({ waypoints: [newWaypoint] });
            return;
        }

        set({ isFetching: true });

        // Get last waypoint to route from
        const lastWaypoint = waypoints[waypoints.length - 1];
        let directionData = null;

        // Fetch directions ONLY if not in manual mode
        if (!isManualMode) {
            directionData = await getDirections(
                [lastWaypoint.lng, lastWaypoint.lat],
                [lng, lat],
                'walking'
            );
        }

        let newSegment: Segment;

        if (directionData) {
            newSegment = {
                id: crypto.randomUUID(),
                geometry: directionData.geometry,
                distance: directionData.distance,
            };
        } else {
            // Manual Mode OR Fallback: Straight line
            newSegment = {
                id: crypto.randomUUID(),
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [lastWaypoint.lng, lastWaypoint.lat],
                        [lng, lat]
                    ]
                },
                distance: calculateDistance(lastWaypoint.lat, lastWaypoint.lng, lat, lng)
            };
        }

        // Now Fetch Elevation for the segment geometry
        const segmentCoords = newSegment.geometry.coordinates;
        const elevations = await getElevationData(segmentCoords);

        // Map elevations to distances within the segment
        const mappedElevationProfile: ElevationPoint[] = [];
        if (elevations.length > 0) {
            for (let i = 0; i < elevations.length; i++) {
                const percent = i / (elevations.length - 1 || 1);
                const distFromSegmentStart = percent * newSegment.distance;
                mappedElevationProfile.push({
                    distance: distFromSegmentStart, // relative to segment
                    elevation: elevations[i]
                });
            }
            newSegment.elevationProfile = mappedElevationProfile;
        }


        const newSegments = [...segments, newSegment];

        // Update previous 'end' point to 'route' (hidden)
        const updatedWaypoints = waypoints.map((wp, i) =>
            (i === waypoints.length - 1 && wp.type === 'end')
                ? { ...wp, type: 'route' as const }
                : wp
        );

        const newWaypoints = [...updatedWaypoints, newWaypoint];

        // Combine all segments into one LineString for the map
        const allCoordinates = newSegments.flatMap(seg => seg.geometry.coordinates);

        const newRouteGeoJson: GeoJSON.Feature<GeoJSON.LineString> = {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: allCoordinates
            }
        };

        const newTotalDistance = newSegments.reduce((acc, seg) => acc + seg.distance, 0);

        // Rebuild full cumulative elevation profile AND calculate gain
        let currentCumulativeDist = 0;
        const fullElevationProfile: ElevationPoint[] = [];
        let elevationGain = 0;

        newSegments.forEach(seg => {
            if (seg.elevationProfile && seg.elevationProfile.length > 0) {
                let previousElev = seg.elevationProfile[0].elevation;

                seg.elevationProfile.forEach(point => {
                    // Add to profile
                    fullElevationProfile.push({
                        distance: currentCumulativeDist + point.distance,
                        elevation: point.elevation
                    });

                    // Calculate gain
                    const delta = point.elevation - previousElev;
                    if (delta > 0) {
                        elevationGain += delta;
                    }
                    previousElev = point.elevation;
                });
            }
            currentCumulativeDist += seg.distance;
        });

        set({
            waypoints: newWaypoints,
            segments: newSegments,
            routeGeoJson: newRouteGeoJson,
            totalDistance: newTotalDistance,
            elevationProfile: fullElevationProfile,
            totalElevationGain: elevationGain,
            isFetching: false
        });
    },

    undoLastWaypoint: () => {
        const { waypoints, segments, isReadOnly } = get();
        if (isReadOnly || waypoints.length === 0) return;

        // If only 1 waypoint, clear everything
        if (waypoints.length === 1) {
            get().clearRoute();
            return;
        }

        // Remove last waypoint
        const newWaypoints = waypoints.slice(0, -1);

        // Restore the new last waypoint to 'end' type
        newWaypoints[newWaypoints.length - 1] = {
            ...newWaypoints[newWaypoints.length - 1],
            type: 'end'
        };

        // Remove last segment
        const newSegments = segments.slice(0, -1);

        // Re-calculate totals (Copy-paste logic from addWaypoint or abstract it)
        // For efficiency, let's just re-run the aggregation logic

        const allCoordinates = newSegments.flatMap(seg => seg.geometry.coordinates);

        // If no segments left (e.g. undo back to start point), route is empty
        let newRouteGeoJson: GeoJSON.Feature<GeoJSON.LineString> | null = null;

        if (allCoordinates.length > 0) {
            newRouteGeoJson = {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: allCoordinates
                }
            };
        }

        const newTotalDistance = newSegments.reduce((acc, seg) => acc + seg.distance, 0);

        let currentCumulativeDist = 0;
        const fullElevationProfile: ElevationPoint[] = [];
        let elevationGain = 0;

        newSegments.forEach(seg => {
            if (seg.elevationProfile && seg.elevationProfile.length > 0) {
                let previousElev = seg.elevationProfile[0].elevation;

                seg.elevationProfile.forEach(point => {
                    fullElevationProfile.push({
                        distance: currentCumulativeDist + point.distance,
                        elevation: point.elevation
                    });

                    const delta = point.elevation - previousElev;
                    if (delta > 0) elevationGain += delta;
                    previousElev = point.elevation;
                });
            }
            currentCumulativeDist += seg.distance;
        });

        set({
            waypoints: newWaypoints,
            segments: newSegments,
            routeGeoJson: newRouteGeoJson,
            totalDistance: newTotalDistance,
            elevationProfile: fullElevationProfile,
            totalElevationGain: elevationGain
        });
    },

    removeWaypoint: (id) => {
        if (get().isReadOnly) return;
        set((state) => {
            // Simplified removal for MVP - Reset everything if removing intermediate points is too complex
            // Ideally we should stitch the route back together, but that requires re-fetching directions.
            // For now, if you remove a point, let's just remove it and reset geometry (force user to redraw or just broken route?)
            // Actually, best "remove" UX for line-based routing is usually just 'Undo'.
            // Removing a middle pin is complex.
            // Let's defer complex removal. 
            const newWaypoints = state.waypoints.filter((wp) => wp.id !== id);
            return {
                waypoints: newWaypoints,
                segments: [],
                routeGeoJson: null,
                totalDistance: 0,
                totalElevationGain: 0,
                elevationProfile: []
            };
        });
    },

    clearRoute: () => set({
        waypoints: [],
        segments: [],
        routeGeoJson: null,
        totalDistance: 0,
        totalElevationGain: 0,
        elevationProfile: [],
        shouldFitBounds: false,
        routeName: "New Route",
        hoveredDistance: null,
        isReadOnly: false
    }),

    setShouldFitBounds: (should: boolean) => set({ shouldFitBounds: should }),

    setRouteFromImport: (featureCollection: GeoJSON.FeatureCollection) => {
        // Find first LineString
        const trackFeature = featureCollection.features.find(f => f.geometry.type === 'LineString') as GeoJSON.Feature<GeoJSON.LineString> | undefined;

        if (!trackFeature) return;

        // Extract Name
        const importedName = trackFeature.properties?.name || "Imported Route";

        const coords = trackFeature.geometry.coordinates;
        if (coords.length < 2) return;

        // Create Waypoints (Start and End only for now to "lock" the route)
        const startCoord = coords[0];
        const endCoord = coords[coords.length - 1];

        const startWP: Waypoint = { id: crypto.randomUUID(), lng: startCoord[0], lat: startCoord[1], type: 'start' };
        const endWP: Waypoint = { id: crypto.randomUUID(), lng: endCoord[0], lat: endCoord[1], type: 'end' };

        // Calculate stats from the track
        let dist = 0;
        let gain = 0;
        let prevEle = coords[0][2] || 0;
        const elevationProfile: ElevationPoint[] = [];

        for (let i = 0; i < coords.length; i++) {
            const curr = coords[i];
            const prev = i > 0 ? coords[i - 1] : curr;

            // Distance
            if (i > 0) {
                dist += calculateDistance(prev[1], prev[0], curr[1], curr[0]);
            }

            // Elevation
            const ele = curr[2] || 0; // GeoJSON from GPX usually puts elevation in 3rd coord
            if (ele) {
                elevationProfile.push({ distance: dist, elevation: ele });
                if (i > 0) {
                    const delta = ele - prevEle;
                    if (delta > 0) gain += delta;
                    prevEle = ele;
                }
            }
        }

        // Create a single "Custom/Imported" segment
        const segment: Segment = {
            id: crypto.randomUUID(),
            geometry: trackFeature.geometry,
            distance: dist,
            elevationProfile: elevationProfile
        };

        set({
            waypoints: [startWP, endWP],
            segments: [segment],
            routeGeoJson: trackFeature,
            totalDistance: dist,
            totalElevationGain: gain,
            elevationProfile: elevationProfile,
            isFetching: false,
            shouldFitBounds: true,
            routeName: importedName,
            isReadOnly: true
        });
    }
}));
