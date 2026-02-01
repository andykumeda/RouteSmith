import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useRouteStore } from '../../store/useRouteStore';
import { getCoordinateAtDistance, getDistanceAtCoordinate } from '../../lib/geoUtils';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const MapComponent = () => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const { waypoints, addWaypoint, routeGeoJson, hoveredDistance, setHoveredDistance, isReadOnly } = useRouteStore();

    const [viewState, setViewState] = useState({
        zoom: 10,
        lat: 37.7749,
        lng: -122.4194
    });

    // Track dragging to toggle cursor
    const [isDragging, setIsDragging] = useState(false);

    // Initialize Map
    useEffect(() => {
        if (map.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current!,
            style: 'mapbox://styles/mapbox/outdoors-v12',
            center: [0, 20], // Default: Globe view
            zoom: 2,
        });

        const nav = new mapboxgl.NavigationControl();
        map.current.addControl(nav, 'top-right');

        const geolocate = new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showUserHeading: true,
            fitBoundsOptions: {
                maxZoom: 11 // Limit zoom level when locating user
            }
        });
        map.current.addControl(geolocate, 'top-right');

        // Log Geolocation Errors
        geolocate.on('error', (e) => {
            console.error('Geolocation Error:', e);
            alert("Could not find your location. Please check browser permissions and ensure you are using HTTPS.");
        });

        // Track Dragging
        map.current.on('dragstart', () => setIsDragging(true));
        map.current.on('dragend', () => setIsDragging(false));

        map.current.on('load', () => {
            // Delay just slightly to ensure everything is ready
            setTimeout(() => {
                geolocate.trigger();
            }, 1000);

            // Sources
            map.current?.addSource('route', {
                type: 'geojson',
                data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
            });

            // Hover Marker Source
            map.current?.addSource('hover-marker', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });

            // Layers
            map.current?.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#2563eb', // blue-600
                    'line-width': 4,
                    'line-opacity': 0.8
                }
            });

            // Hit Area Layer (invisible, thicker for easier hovering)
            map.current?.addLayer({
                id: 'route-hit-area',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': 'transparent',
                    'line-width': 20
                }
            });

            // Hover Marker Layer
            map.current?.addLayer({
                id: 'hover-marker-point',
                type: 'circle',
                source: 'hover-marker',
                paint: {
                    'circle-radius': 6,
                    'circle-color': '#fff',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#2563eb'
                }
            });


            // Add Click Handler
            map.current?.on('click', (e) => {
                // If we are clicking on the map (not a marker), add a waypoint
                if (!useRouteStore.getState().isReadOnly) {
                    addWaypoint(e.lngLat.lng, e.lngLat.lat);
                }
            });

            // Map -> Chart Sync Interactions
            map.current?.on('mousemove', 'route-hit-area', (e) => {
                const { routeGeoJson } = useRouteStore.getState();
                if (!routeGeoJson) return;

                const dist = getDistanceAtCoordinate(routeGeoJson, e.lngLat.lng, e.lngLat.lat);
                if (dist !== null) {
                    setHoveredDistance(dist);
                    // Force crosshair if over line, even if default is crosshair (redundant but safe)
                    // But if dragging, we don't want this.
                    // Actually, if dragging, mousemove might typically fire?
                    // Mapbox usually suppresses normal interactions during drag.
                }
            });

            map.current?.on('mouseleave', 'route-hit-area', () => {
                setHoveredDistance(null);
            });
        });

        // Track View State
        map.current.on('move', () => {
            if (!map.current) return;
            const center = map.current.getCenter();
            setViewState({
                zoom: map.current.getZoom(),
                lat: center.lat,
                lng: center.lng
            });
        });

    }, []);

    // Update Route Layer & Handle Auto-Zoom
    useEffect(() => {
        if (!map.current || !map.current.isStyleLoaded()) return;

        const source = map.current.getSource('route') as mapboxgl.GeoJSONSource;
        if (source && routeGeoJson) {
            source.setData(routeGeoJson);

            if (useRouteStore.getState().shouldFitBounds) {
                const bounds = new mapboxgl.LngLatBounds();
                routeGeoJson.geometry.coordinates.forEach(coord => {
                    bounds.extend([coord[0], coord[1]]);
                });
                map.current.fitBounds(bounds, { padding: 50 });
                useRouteStore.getState().setShouldFitBounds(false);
            }
        } else if (source) {
            source.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
        }
    }, [routeGeoJson]);

    // Handle Hover Sync (Chart -> Map)
    useEffect(() => {
        // console.log('DEBUG: Map Effect Triggered. Dist:', hoveredDistance);

        if (!map.current) {
            // console.warn('DEBUG: Map ref is null');
            return;
        }

        if (!map.current.isStyleLoaded()) {
            // console.warn('DEBUG: Map style NOT loaded');
            // Attempt to continue anyway if source exists, but usually unsafe.
            // But let's log it.
        }

        const source = map.current.getSource('hover-marker') as mapboxgl.GeoJSONSource;
        if (!source) {
            // console.error('DEBUG: Source "hover-marker" NOT found on map');
            return;
        }

        // console.log('DEBUG: Source found. Updating...');

        if (hoveredDistance !== null && routeGeoJson) {
            const coord = getCoordinateAtDistance(routeGeoJson, hoveredDistance);
            // console.log('DEBUG: Coord Result:', coord);

            if (coord) {
                source.setData({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: coord },
                    properties: {}
                });
            } else {
                console.error('DEBUG: Coord is null. Route:', !!routeGeoJson, 'Dist:', hoveredDistance);
            }
        } else {
            source.setData({ type: 'FeatureCollection', features: [] });
        }
    }, [hoveredDistance, routeGeoJson]);


    // Update Waypoints (Markers)
    const markersRef = useRef<{ [id: string]: mapboxgl.Marker }>({});

    useEffect(() => {
        if (!map.current) return;

        // Remove deleted markers
        Object.keys(markersRef.current).forEach(id => {
            if (!waypoints.find(wp => wp.id === id)) {
                markersRef.current[id].remove();
                delete markersRef.current[id];
            }
        });

        // Add/Update markers
        waypoints.forEach((wp, index) => {
            // Only render visual markers (Start, End, POI)
            if (wp.type === 'route') {
                // Remove if exists
                if (markersRef.current[wp.id]) {
                    markersRef.current[wp.id].remove();
                    delete markersRef.current[wp.id];
                }
                return;
            }

            if (!markersRef.current[wp.id]) {
                const el = document.createElement('div');

                // Styling based on type
                let bgClass = 'bg-blue-600';
                if (wp.type === 'start') bgClass = 'bg-green-600';
                if (wp.type === 'end') bgClass = 'bg-red-600';
                if (wp.type === 'poi') bgClass = 'bg-purple-600';

                el.className = `w-6 h-6 ${bgClass} rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-bold`;

                // Content based on type
                if (wp.type === 'start') el.innerText = 'S';
                else if (wp.type === 'end') el.innerText = 'E';
                else el.innerText = (index + 1).toString();

                const marker = new mapboxgl.Marker(el)
                    .setLngLat([wp.lng, wp.lat])
                    .addTo(map.current!);

                markersRef.current[wp.id] = marker;
            } else {
                markersRef.current[wp.id].setLngLat([wp.lng, wp.lat]);

                // Update styling if type changed (e.g. End became Route or End changed position? 
                // Actually 'end' moves to new point, old point becomes 'route'. 
                // So the old ID's marker needs to be removed (handled above) 
                // or updated if we kept the ID? 
                // No, new point has new ID. Old point has old ID.
                // Old point type changed to 'route' in store. 
                // So it will be caught by the "if route remove" block above on re-render.
                // This block is for existing markers that are still visible.
            }
        });
    }, [waypoints]);

    return (
        <div className="relative w-full h-full">
            <div
                ref={mapContainer}
                className={`w-full h-full ${(!isReadOnly && !isDragging) ? '[&_.mapboxgl-canvas]:!cursor-crosshair' : ''}`}
            />
            {/* Info Overlay */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm border border-gray-200 text-xs font-mono text-gray-600 z-10 pointer-events-none tabular-nums">
                Zoom: {viewState.zoom.toFixed(2)} | {viewState.lat.toFixed(4)}, {viewState.lng.toFixed(4)}
            </div>
        </div>
    );
};

export default MapComponent;
