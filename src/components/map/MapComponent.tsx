import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useRouteStore } from '../../store/useRouteStore';
import { getCoordinateAtDistance, getDistanceAtCoordinate } from '../../lib/geoUtils';
import MapStyleSwitcher from './MapStyleSwitcher';
import type { MapStyle } from './MapStyleSwitcher';
import { Play, Square, Droplets, TriangleAlert, CircleSlash, Camera, X } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { POIType } from '../../store/useRouteStore';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const STYLE_URLS: Record<MapStyle, string> = {
    outdoors: 'mapbox://styles/mapbox/outdoors-v12',
    streets: 'mapbox://styles/mapbox/streets-v12',
    satellite: 'mapbox://styles/mapbox/satellite-v9'
};

const MapComponent = () => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const { waypoints, addWaypoint, addPOI, routeGeoJson, hoveredDistance, setHoveredDistance, isReadOnly } = useRouteStore();

    const [selectedPOIType, setSelectedPOIType] = useState<POIType | null>(null);
    const selectedPOITypeRef = useRef(selectedPOIType);
    useEffect(() => { selectedPOITypeRef.current = selectedPOIType; }, [selectedPOIType]);

    const [viewState, setViewState] = useState({
        zoom: 10,
        lat: 37.7749,
        lng: -122.4194
    });

    const [mapStyle, setMapStyle] = useState<MapStyle>('outdoors');

    // Track dragging to toggle cursor
    const [isDragging, setIsDragging] = useState(false);

    // Unified Map Sync Effect
    useEffect(() => {
        if (!map.current) return;

        const updateMap = () => {
            const m = map.current;
            if (!m || !m.isStyleLoaded()) return;

            // Sources
            if (!m.getSource('route')) {
                m.addSource('route', {
                    type: 'geojson',
                    data: routeGeoJson || { type: 'FeatureCollection', features: [] }
                });
            }
            if (!m.getSource('hover-marker')) {
                m.addSource('hover-marker', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] }
                });
            }

            // Layers
            if (!m.getLayer('route-line')) {
                m.addLayer({
                    id: 'route-line',
                    type: 'line',
                    source: 'route',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: { 'line-color': '#2563eb', 'line-width': 4, 'line-opacity': 0.8 }
                });
            }
            if (!m.getLayer('route-hit-area')) {
                m.addLayer({
                    id: 'route-hit-area',
                    type: 'line',
                    source: 'route',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: { 'line-color': 'transparent', 'line-width': 20 }
                });

                // RE-BIND Layer Listeners (must be re-added when layer is re-added)
                m.on('mousemove', 'route-hit-area', (e) => {
                    const { routeGeoJson: currentGeoJson } = useRouteStore.getState();
                    if (!currentGeoJson) return;
                    const dist = getDistanceAtCoordinate(currentGeoJson, e.lngLat.lng, e.lngLat.lat);
                    if (dist !== null) setHoveredDistance(dist);
                });

                m.on('mouseleave', 'route-hit-area', () => {
                    setHoveredDistance(null);
                });
            }
            if (!m.getLayer('hover-marker-point')) {
                m.addLayer({
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

            // Update Data
            const routeSource = m.getSource('route') as mapboxgl.GeoJSONSource;
            if (routeSource) {
                routeSource.setData(routeGeoJson || { type: 'FeatureCollection', features: [] });
            }

            const hoverSource = m.getSource('hover-marker') as mapboxgl.GeoJSONSource;
            if (hoverSource) {
                if (hoveredDistance !== null && routeGeoJson) {
                    const coord = getCoordinateAtDistance(routeGeoJson, hoveredDistance);
                    if (coord) {
                        hoverSource.setData({
                            type: 'Feature',
                            geometry: { type: 'Point', coordinates: coord },
                            properties: {}
                        });
                    }
                } else {
                    hoverSource.setData({ type: 'FeatureCollection', features: [] });
                }
            }

            // Fit Bounds
            if (routeGeoJson && useRouteStore.getState().shouldFitBounds) {
                const bounds = new mapboxgl.LngLatBounds();
                const coordinates = routeGeoJson.features.flatMap((f: any) =>
                    f.geometry.type === 'LineString' ? f.geometry.coordinates : []
                );

                if (coordinates.length > 0) {
                    coordinates.forEach((coord: any) => bounds.extend([coord[0], coord[1]]));
                    m.fitBounds(bounds, { padding: 50 });
                    useRouteStore.getState().setShouldFitBounds(false);
                }
            }
        };

        if (map.current.isStyleLoaded()) {
            updateMap();
        } else {
            map.current.once('style.load', updateMap);
        }
    }, [mapStyle, routeGeoJson, hoveredDistance]);

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

        map.current.on('dragstart', () => setIsDragging(true));
        map.current.on('dragend', () => setIsDragging(false));

        map.current.on('load', () => {
            setTimeout(() => {
                geolocate.trigger();
            }, 1000);

            map.current?.on('click', (e) => {
                const state = useRouteStore.getState();
                if (state.isReadOnly) return;

                const poiType = selectedPOITypeRef.current;
                if (poiType) {
                    addPOI(e.lngLat.lng, e.lngLat.lat, poiType);
                    setSelectedPOIType(null); // Reset after placement
                } else {
                    addWaypoint(e.lngLat.lng, e.lngLat.lat);
                }
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

    // Marker management is handled in a separate effect
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
                } else if (wp.type === 'poi') {
                    if (wp.poiType === 'water') {
                        color = '#3b82f6'; // blue-500
                        iconMarkup = renderToStaticMarkup(<Droplets size={12} className="text-white" />);
                    } else if (wp.poiType === 'hazard') {
                        color = '#f59e0b'; // amber-500
                        iconMarkup = renderToStaticMarkup(<TriangleAlert size={12} className="text-white" />);
                    } else if (wp.poiType === 'closed') {
                        color = '#ef4444'; // red-500
                        iconMarkup = renderToStaticMarkup(<CircleSlash size={12} className="text-white" />);
                    } else if (wp.poiType === 'camera') {
                        color = '#a855f7'; // purple-500
                        iconMarkup = renderToStaticMarkup(<Camera size={12} className="text-white" />);
                    } else {
                        // Generic POI
                        color = '#64748b'; // slate-500
                        el.innerText = (index + 1).toString();
                        el.className = 'text-white text-[10px] font-bold';
                    }
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
                className={`w-full h-full ${(!isReadOnly && !isDragging) ? (selectedPOIType ? '[&_.mapboxgl-canvas]:!cursor-copy' : '[&_.mapboxgl-canvas]:!cursor-crosshair') : ''}`}
            />

            <MapStyleSwitcher currentStyle={mapStyle} onStyleChange={setMapStyle} />

            {/* POI Toolbar */}
            {!isReadOnly && (
                <div className="absolute bottom-10 left-4 z-10 flex flex-col gap-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200">
                    {[
                        { type: 'water' as POIType, icon: <Droplets size={18} />, color: 'text-blue-500', label: 'Water' },
                        { type: 'hazard' as POIType, icon: <TriangleAlert size={18} />, color: 'text-amber-500', label: 'Hazard' },
                        { type: 'closed' as POIType, icon: <CircleSlash size={18} />, color: 'text-red-500', label: 'Closed' },
                        { type: 'camera' as POIType, icon: <Camera size={18} />, color: 'text-purple-500', label: 'Photo Op' },
                    ].map((poi) => (
                        <button
                            key={poi.type}
                            onClick={() => setSelectedPOIType(selectedPOIType === poi.type ? null : poi.type)}
                            className={`p-2.5 rounded-lg transition-all flex items-center justify-center hover:scale-110 ${selectedPOIType === poi.type ? 'bg-gray-100 ring-2 ring-blue-400' : 'hover:bg-gray-50'}`}
                            title={poi.label}
                        >
                            <span className={poi.color}>{poi.icon}</span>
                        </button>
                    ))}
                    {selectedPOIType && (
                        <button
                            onClick={() => setSelectedPOIType(null)}
                            className="p-1 mt-1 text-gray-400 hover:text-gray-600 self-center"
                            title="Cancel POI"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            )}

            {/* Info Overlay */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm border border-gray-200 text-xs font-mono text-gray-600 z-10 pointer-events-none tabular-nums">
                Zoom: {viewState.zoom.toFixed(2)} | {viewState.lat.toFixed(4)}, {viewState.lng.toFixed(4)}
            </div>
        </div>
    );
};

export default MapComponent;
