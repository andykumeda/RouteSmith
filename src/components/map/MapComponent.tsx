import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useRouteStore } from '../../store/useRouteStore';
import { getCoordinateAtDistance, getDistanceAtCoordinate } from '../../lib/geoUtils';
import MapStyleSwitcher from './MapStyleSwitcher';
import type { MapStyle } from './MapStyleSwitcher';
import { Play, Square } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const STYLE_URLS: Record<MapStyle, string> = {
    outdoors: 'mapbox://styles/mapbox/outdoors-v12',
    streets: 'mapbox://styles/mapbox/streets-v12',
    satellite: 'mapbox://styles/mapbox/satellite-v9'
};

const MapComponent = () => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const { waypoints, addWaypoint, routeGeoJson, hoveredDistance, setHoveredDistance, isReadOnly } = useRouteStore();

    const [viewState, setViewState] = useState({
        zoom: 10,
        lat: 37.7749,
        lng: -122.4194
    });

    const [mapStyle, setMapStyle] = useState<MapStyle>('outdoors');

    // Track dragging to toggle cursor
    const [isDragging, setIsDragging] = useState(false);

    // Track state in refs for listeners to avoid closures
    const routeGeoJsonRef = useRef(routeGeoJson);
    useEffect(() => { routeGeoJsonRef.current = routeGeoJson; }, [routeGeoJson]);

    // Reusable function to setup sources and layers
    const setupMapLayers = useCallback(() => {
        if (!map.current) return;

        // Sources
        if (!map.current.getSource('route')) {
            map.current.addSource('route', {
                type: 'geojson',
                data: routeGeoJsonRef.current || { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
            });
        }

        if (!map.current.getSource('hover-marker')) {
            map.current.addSource('hover-marker', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });
        }

        // Layers
        if (!map.current.getLayer('route-line')) {
            map.current.addLayer({
                id: 'route-line',
                type: 'line',
                source: 'route',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#2563eb',
                    'line-width': 4,
                    'line-opacity': 0.8
                }
            });
        }

        if (!map.current.getLayer('route-hit-area')) {
            map.current.addLayer({
                id: 'route-hit-area',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                    'line-color': 'transparent',
                    'line-width': 20
                }
            });
        }

        if (!map.current.getLayer('hover-marker-point')) {
            map.current.addLayer({
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
        }
    }, []);

    // Initialize Map
    useEffect(() => {
        if (map.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current!,
            style: STYLE_URLS[mapStyle],
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

        // Important: Use style.load event to ensure layers are added whenever style changes
        map.current.on('style.load', () => {
            setupMapLayers();
        });

        map.current.on('load', () => {
            // Delay just slightly to ensure everything is ready
            setTimeout(() => {
                geolocate.trigger();
            }, 1000);

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

    // Handle Style Change
    useEffect(() => {
        if (!map.current) return;
        map.current.setStyle(STYLE_URLS[mapStyle]);
    }, [mapStyle]);

    // Update Route Layer & Handle Auto-Zoom
    useEffect(() => {
        if (!map.current) return;

        const updateData = () => {
            const source = map.current?.getSource('route') as mapboxgl.GeoJSONSource;
            if (source) {
                source.setData(routeGeoJson || { type: 'FeatureCollection', features: [] });

                if (routeGeoJson && useRouteStore.getState().shouldFitBounds) {
                    const bounds = new mapboxgl.LngLatBounds();
                    const coordinates = routeGeoJson.features.flatMap((f: any) => f.geometry.coordinates);

                    if (coordinates && coordinates.length > 0) {
                        coordinates.forEach((coord: any) => bounds.extend([coord[0], coord[1]]));
                        map.current?.fitBounds(bounds, { padding: 50 });
                        useRouteStore.getState().setShouldFitBounds(false);
                    }
                }
            }
        };

        if (map.current.isStyleLoaded()) {
            updateData();
        } else {
            map.current.once('style.load', updateData);
        }
    }, [routeGeoJson]);

    // Handle Hover Sync (Chart -> Map)
    useEffect(() => {
        // console.log('DEBUG: Map Effect Triggered. Dist:', hoveredDistance);

        if (!map.current || !map.current.isStyleLoaded()) {
            // console.warn('DEBUG: Map ref is null');
            return;
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
            if (wp.type === 'route') {
                if (markersRef.current[wp.id]) {
                    markersRef.current[wp.id].remove();
                    delete markersRef.current[wp.id];
                }
                return;
            }

            if (!markersRef.current[wp.id]) {
                const el = document.createElement('div');
                let color = '#2563eb';
                let iconMarkup = '';

                if (wp.type === 'start') {
                    color = '#16a34a'; // green-600
                    iconMarkup = renderToStaticMarkup(<Play size={10} fill="white" className="ml-0.5" />);
                } else if (wp.type === 'end') {
                    color = '#dc2626'; // red-600
                    iconMarkup = renderToStaticMarkup(<Square size={8} fill="white" />);
                } else {
                    el.innerText = (index + 1).toString();
                    el.className = 'text-white text-[10px] font-bold';
                }

                const container = document.createElement('div');
                container.className = `w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-transform hover:scale-110 cursor-pointer`;
                container.style.backgroundColor = color;
                if (iconMarkup) container.innerHTML = iconMarkup;
                else container.appendChild(el);

                const marker = new mapboxgl.Marker(container)
                    .setLngLat([wp.lng, wp.lat])
                    .addTo(map.current!);

                markersRef.current[wp.id] = marker;
            } else {
                markersRef.current[wp.id].setLngLat([wp.lng, wp.lat]);
            }
        });
    }, [waypoints]);

    return (
        <div className="relative w-full h-full">
            <div
                ref={mapContainer}
                className={`w-full h-full ${(!isReadOnly && !isDragging) ? '[&_.mapboxgl-canvas]:!cursor-crosshair' : ''}`}
            />

            <MapStyleSwitcher currentStyle={mapStyle} onStyleChange={setMapStyle} />

            {/* Info Overlay */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm border border-gray-200 text-xs font-mono text-gray-600 z-10 pointer-events-none tabular-nums">
                Zoom: {viewState.zoom.toFixed(2)} | {viewState.lat.toFixed(4)}, {viewState.lng.toFixed(4)}
            </div>
        </div>
    );
};

export default MapComponent;
