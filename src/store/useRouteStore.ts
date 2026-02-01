import { create } from 'zustand';
import { getDirections, getElevationData, getPlaceName } from '../lib/mapboxUtils';
import { calculateDistance } from '../lib/geoUtils';

export type POIType = 'water' | 'hazard' | 'closed' | 'camera';

export interface Waypoint {
    id: string;
    lng: number;
    lat: number;
    elevation?: number;
    type: 'start' | 'end' | 'route' | 'poi'; // Visual type
    poiType?: POIType;
    comment?: string;
    date?: string;
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
    routeGeoJson: GeoJSON.FeatureCollection | null;
    totalDistance: number;
    totalElevationGain: number;
    elevationProfile: ElevationPoint[];
    minElevation: number | null;
    maxElevation: number | null;
    isFetching: boolean;
    shouldFitBounds: boolean;
    routeName: string;
    routeId: string | null;
    hoveredDistance: number | null;
    isReadOnly: boolean;
    isManualMode: boolean;

    addWaypoint: (lng: number, lat: number) => Promise<void>;
    addPOI: (lng: number, lat: number, type: POIType) => void;
    updateWaypoint: (id: string, updates: Partial<Waypoint>) => Promise<void>;
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
    minElevation: null,
    maxElevation: null,
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

    addWaypoint: async (lng: number, lat: number) => {
        const { waypoints, segments, routeName, isReadOnly, isManualMode } = get();

        if (isReadOnly) return;

        if (waypoints.length === 0 && (routeName === "New Route" || routeName === "")) {
            getPlaceName(lng, lat).then(name => {
                if (name) {
                    set({ routeName: `Route near ${name}` });
                }
            });
        }

        const routingWaypoints = waypoints.filter(w => w.type !== 'poi');

        const newWaypoint: Waypoint = {
            id: crypto.randomUUID(),
            lng,
            lat,
            type: routingWaypoints.length === 0 ? 'start' : 'end'
        };

        if (routingWaypoints.length === 0) {
            set({ waypoints: [...waypoints, newWaypoint] });
            return;
        }

        set({ isFetching: true });

        const lastRoutingWaypoint = routingWaypoints[routingWaypoints.length - 1];
        let directionData = null;

        if (!isManualMode) {
            directionData = await getDirections(
                [lastRoutingWaypoint.lng, lastRoutingWaypoint.lat],
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
            newSegment = {
                id: crypto.randomUUID(),
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [lastRoutingWaypoint.lng, lastRoutingWaypoint.lat],
                        [lng, lat]
                    ]
                },
                distance: calculateDistance(lastRoutingWaypoint.lat, lastRoutingWaypoint.lng, lat, lng)
            };
        }

        const segmentCoords = newSegment.geometry.coordinates;
        const elevations = await getElevationData(segmentCoords);

        const mappedElevationProfile: ElevationPoint[] = [];
        if (elevations.length > 0) {
            for (let i = 0; i < elevations.length; i++) {
                const percent = i / (elevations.length - 1 || 1);
                const distFromSegmentStart = percent * newSegment.distance;
                mappedElevationProfile.push({
                    distance: distFromSegmentStart,
                    elevation: elevations[i]
                });
            }
            newSegment.elevationProfile = mappedElevationProfile;
        }

        const newSegments = [...segments, newSegment];

        // Ensure the previous 'end' point becomes a 'route' point
        const newWaypoints = waypoints.map(wp => {
            if (wp.id === lastRoutingWaypoint.id && wp.type === 'end') {
                return { ...wp, type: 'route' as const };
            }
            return wp;
        });

        newWaypoints.push(newWaypoint);

        const allCoordinates = newSegments.flatMap(seg => seg.geometry.coordinates);

        const newRouteGeoJson: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: allCoordinates
                    }
                }
            ]
        };

        const newTotalDistance = newSegments.reduce((acc, seg) => acc + seg.distance, 0);

        let currentCumulativeDist = 0;
        const fullElevationProfile: ElevationPoint[] = [];
        let elevationGain = 0;
        const GAIN_THRESHOLD = 2.0;

        let minElev = Infinity;
        let maxElev = -Infinity;

        newSegments.forEach(seg => {
            if (seg.elevationProfile && seg.elevationProfile.length > 0) {
                let referenceElev = seg.elevationProfile[0].elevation;

                seg.elevationProfile.forEach(point => {
                    fullElevationProfile.push({
                        distance: currentCumulativeDist + point.distance,
                        elevation: point.elevation
                    });

                    if (point.elevation < minElev) minElev = point.elevation;
                    if (point.elevation > maxElev) maxElev = point.elevation;

                    if (point.elevation > referenceElev + GAIN_THRESHOLD) {
                        elevationGain += (point.elevation - referenceElev);
                        referenceElev = point.elevation;
                    } else if (point.elevation < referenceElev) {
                        referenceElev = point.elevation;
                    }
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
            minElevation: minElev === Infinity ? null : minElev,
            maxElevation: maxElev === -Infinity ? null : maxElev,
            isFetching: false
        });
    },

    addPOI: (lng: number, lat: number, type: POIType) => {
        const { waypoints, isReadOnly } = get();
        if (isReadOnly) return;

        const newPOI: Waypoint = {
            id: crypto.randomUUID(),
            lng,
            lat,
            type: 'poi',
            poiType: type
        };

        set({ waypoints: [...waypoints, newPOI] });
    },

    updateWaypoint: async (id, updates) => {
        const { waypoints, isReadOnly, isManualMode } = get();
        if (isReadOnly) return;

        const wpIndex = waypoints.findIndex(w => w.id === id);
        if (wpIndex === -1) return;

        const oldWP = waypoints[wpIndex];
        const newWaypoints = [...waypoints];
        newWaypoints[wpIndex] = { ...oldWP, ...updates };

        // If it's just metadata (comment, date, type), simple update
        const posChanged = updates.lng !== undefined || updates.lat !== undefined;
        const isRoutePoint = oldWP.type === 'start' || oldWP.type === 'end' || oldWP.type === 'route';

        if (!posChanged || !isRoutePoint) {
            set({ waypoints: newWaypoints });
            return;
        }

        // Deep Update: Position of a route point changed. Need to rebuild segments.
        set({ isFetching: true, waypoints: newWaypoints });

        // For simplicity and to avoid complex logic, we'll rebuild all segments 
        // that are adjacent to the moved point. 
        // Actually, the current addWaypoint logic is quite cumulative. 
        // To be robust, let's implement a full rebuild helper later, 
        // but for now let's just update the neighbors.

        // RE-CALCULATION LOGIC (Unified for add/update)
        // [This will be further refactored if needed, but for now we'll do it surgical]

        const routingWaypoints = newWaypoints.filter(w => w.type !== 'poi');
        const routeIdx = routingWaypoints.findIndex(w => w.id === id);

        const newSegments = [...get().segments];

        const updateSegmentBetween = async (idxA: number, idxB: number) => {
            const wpA = routingWaypoints[idxA];
            const wpB = routingWaypoints[idxB];

            let directionData = null;
            if (!isManualMode) {
                directionData = await getDirections(
                    [wpA.lng, wpA.lat],
                    [wpB.lng, wpB.lat],
                    'walking'
                );
            }

            let seg: Segment;
            if (directionData) {
                seg = {
                    id: crypto.randomUUID(),
                    geometry: directionData.geometry,
                    distance: directionData.distance,
                };
            } else {
                seg = {
                    id: crypto.randomUUID(),
                    geometry: {
                        type: 'LineString',
                        coordinates: [[wpA.lng, wpA.lat], [wpB.lng, wpB.lat]]
                    },
                    distance: calculateDistance(wpA.lat, wpA.lng, wpB.lat, wpB.lng)
                };
            }

            const elevations = await getElevationData(seg.geometry.coordinates);
            if (elevations.length > 0) {
                const profile: ElevationPoint[] = elevations.map((e, i) => ({
                    distance: (i / (elevations.length - 1 || 1)) * seg.distance,
                    elevation: e
                }));
                seg.elevationProfile = profile;
            }
            return seg;
        };

        // If routeIdx > 0, update segment to previous
        if (routeIdx > 0) {
            newSegments[routeIdx - 1] = await updateSegmentBetween(routeIdx - 1, routeIdx);
        }
        // If routeIdx < routingWaypoints.length - 1, update segment to next
        if (routeIdx < routingWaypoints.length - 1) {
            newSegments[routeIdx] = await updateSegmentBetween(routeIdx, routeIdx + 1);
        }

        // Re-assemble full route from segments
        const allCoordinates = newSegments.flatMap(seg => seg.geometry.coordinates);
        const newRouteGeoJson: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: allCoordinates }
            }]
        };

        const newTotalDistance = newSegments.reduce((acc, seg) => acc + seg.distance, 0);
        let currentCumulativeDist = 0;
        const fullElevationProfile: ElevationPoint[] = [];
        let elevationGain = 0;
        const GAIN_THRESHOLD = 2.0;
        let minElev = Infinity;
        let maxElev = -Infinity;

        newSegments.forEach(seg => {
            if (seg.elevationProfile) {
                let referenceElev = seg.elevationProfile[0].elevation;
                seg.elevationProfile.forEach(point => {
                    fullElevationProfile.push({
                        distance: currentCumulativeDist + point.distance,
                        elevation: point.elevation
                    });
                    if (point.elevation < minElev) minElev = point.elevation;
                    if (point.elevation > maxElev) maxElev = point.elevation;
                    if (point.elevation > referenceElev + GAIN_THRESHOLD) {
                        elevationGain += (point.elevation - referenceElev);
                        referenceElev = point.elevation;
                    } else if (point.elevation < referenceElev) {
                        referenceElev = point.elevation;
                    }
                });
            }
            currentCumulativeDist += seg.distance;
        });

        set({
            segments: newSegments,
            routeGeoJson: newRouteGeoJson,
            totalDistance: newTotalDistance,
            elevationProfile: fullElevationProfile,
            totalElevationGain: elevationGain,
            minElevation: minElev === Infinity ? null : minElev,
            maxElevation: maxElev === -Infinity ? null : maxElev,
            isFetching: false
        });
    },

    undoLastWaypoint: () => {
        const { waypoints, segments, isReadOnly } = get();
        if (isReadOnly || waypoints.length === 0) return;

        if (waypoints.length === 1) {
            get().clearRoute();
            return;
        }

        const lastWP = waypoints[waypoints.length - 1];
        const isRoutePoint = lastWP.type === 'start' || lastWP.type === 'end' || lastWP.type === 'route';

        const newWaypoints = waypoints.slice(0, -1);

        // Ensure the new "last" point is marked as end if it was part of the route
        const lastStillHere = newWaypoints[newWaypoints.length - 1];
        if (isRoutePoint && (lastStillHere.type === 'route' || lastStillHere.type === 'start')) {
            newWaypoints[newWaypoints.length - 1] = {
                ...lastStillHere,
                type: lastStillHere.type === 'start' ? 'start' : 'end'
            };
        }

        // Only remove segment if we removed a route point
        const newSegments = isRoutePoint ? segments.slice(0, -1) : segments;
        const allCoordinates = newSegments.flatMap(seg => seg.geometry.coordinates);

        let newRouteGeoJson: GeoJSON.FeatureCollection | null = null;

        if (allCoordinates.length > 0) {
            newRouteGeoJson = {
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'LineString',
                            coordinates: allCoordinates
                        }
                    }
                ]
            };
        }

        const newTotalDistance = newSegments.reduce((acc, seg) => acc + seg.distance, 0);

        let currentCumulativeDist = 0;
        const fullElevationProfile: ElevationPoint[] = [];
        let elevationGain = 0;
        const GAIN_THRESHOLD = 2.0;
        let minElev = Infinity;
        let maxElev = -Infinity;

        newSegments.forEach(seg => {
            if (seg.elevationProfile && seg.elevationProfile.length > 0) {
                let referenceElev = seg.elevationProfile[0].elevation;

                seg.elevationProfile.forEach(point => {
                    fullElevationProfile.push({
                        distance: currentCumulativeDist + point.distance,
                        elevation: point.elevation
                    });

                    if (point.elevation < minElev) minElev = point.elevation;
                    if (point.elevation > maxElev) maxElev = point.elevation;

                    if (point.elevation > referenceElev + GAIN_THRESHOLD) {
                        elevationGain += (point.elevation - referenceElev);
                        referenceElev = point.elevation;
                    } else if (point.elevation < referenceElev) {
                        referenceElev = point.elevation;
                    }
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
            minElevation: minElev === Infinity ? null : minElev,
            maxElevation: maxElev === -Infinity ? null : maxElev,
        });
    },

    removeWaypoint: (id) => {
        const { waypoints, isReadOnly } = get();
        if (isReadOnly) return;

        const wpToRemove = waypoints.find(w => w.id === id);
        if (!wpToRemove) return;

        const isPOI = wpToRemove.type === 'poi';
        const newWaypoints = waypoints.filter((wp) => wp.id !== id);

        if (isPOI) {
            // Just remove the POI, keep route intact
            set({ waypoints: newWaypoints });
        } else {
            // If a routing point is removed, for now we clear or we'd need to rebuild all segments.
            // Since deleting a point in the middle of a trail is complex, we clear for now (legacy behavior).
            set({
                waypoints: newWaypoints,
                segments: [],
                routeGeoJson: null,
                totalDistance: 0,
                totalElevationGain: 0,
                elevationProfile: [],
                minElevation: null,
                maxElevation: null
            });
        }
    },

    clearRoute: () => set({
        waypoints: [],
        segments: [],
        routeGeoJson: null,
        totalDistance: 0,
        totalElevationGain: 0,
        elevationProfile: [],
        minElevation: null,
        maxElevation: null,
        shouldFitBounds: false,
        routeName: "New Route",
        hoveredDistance: null,
        isReadOnly: false
    }),

    setShouldFitBounds: (should: boolean) => set({ shouldFitBounds: should }),

    setRouteFromImport: (featureCollection: GeoJSON.FeatureCollection) => {
        const trackFeature = featureCollection.features.find(f => f.geometry.type === 'LineString') as GeoJSON.Feature<GeoJSON.LineString> | undefined;

        if (!trackFeature) return;

        const importedName = trackFeature.properties?.name || "Imported Route";
        const coords = trackFeature.geometry.coordinates;
        if (coords.length < 2) return;

        const startCoord = coords[0];
        const endCoord = coords[coords.length - 1];

        const startWP: Waypoint = { id: crypto.randomUUID(), lng: startCoord[0], lat: startCoord[1], type: 'start' };
        const endWP: Waypoint = { id: crypto.randomUUID(), lng: endCoord[0], lat: endCoord[1], type: 'end' };

        let dist = 0;
        let gain = 0;
        const GAIN_THRESHOLD = 2.0;
        const elevationProfile: ElevationPoint[] = [];
        let referenceElev = coords[0][2] || 0;
        let minElev = Infinity;
        let maxElev = -Infinity;

        for (let i = 0; i < coords.length; i++) {
            const curr = coords[i];
            const prev = i > 0 ? coords[i - 1] : curr;

            if (i > 0) {
                dist += calculateDistance(prev[1], prev[0], curr[1], curr[0]);
            }

            const ele = curr[2] || 0;
            if (ele !== undefined) {
                elevationProfile.push({ distance: dist, elevation: ele });
                if (ele < minElev) minElev = ele;
                if (ele > maxElev) maxElev = ele;

                if (ele > referenceElev + GAIN_THRESHOLD) {
                    gain += (ele - referenceElev);
                    referenceElev = ele;
                } else if (ele < referenceElev) {
                    referenceElev = ele;
                }
            }
        }

        const segment: Segment = {
            id: crypto.randomUUID(),
            geometry: trackFeature.geometry,
            distance: dist,
            elevationProfile: elevationProfile
        };

        set({
            waypoints: [startWP, endWP],
            segments: [segment],
            routeGeoJson: {
                type: 'FeatureCollection',
                features: [trackFeature]
            },
            totalDistance: dist,
            totalElevationGain: gain,
            elevationProfile: elevationProfile,
            minElevation: minElev === Infinity ? null : minElev,
            maxElevation: maxElev === -Infinity ? null : maxElev,
            isFetching: false,
            shouldFitBounds: true,
            routeName: importedName,
            isReadOnly: true
        });
    }
}));
