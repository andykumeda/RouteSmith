import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useRouteStore, type POIType, type Waypoint } from '../../store/useRouteStore';
import { getCoordinateAtDistance, getDistanceAtCoordinate } from '../../lib/geoUtils';
import MapStyleSwitcher from './MapStyleSwitcher';
import type { MapStyle } from './MapStyleSwitcher';
import { Play, Square, Droplets, TriangleAlert, CircleSlash, Camera, X, Trash2 } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const STYLE_URLS: Record<MapStyle, string> = {
    outdoors: 'mapbox://styles/mapbox/outdoors-v12',
    streets: 'mapbox://styles/mapbox/streets-v12',
    satellite: 'mapbox://styles/mapbox/satellite-v9'
};

const MapComponent = ({ isSidebarOpen }: { isSidebarOpen: boolean }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const { waypoints, addWaypoint, addPOI, updateWaypoint, removeWaypoint, routeGeoJson, hoveredDistance, setHoveredDistance, isReadOnly, routeId } = useRouteStore();

    const [selectedPOIType, setSelectedPOIType] = useState<POIType | null>(null);
    const [isDeleteMode, setIsDeleteMode] = useState(false);

    const selectedPOITypeRef = useRef(selectedPOIType);
    useEffect(() => { selectedPOITypeRef.current = selectedPOIType; }, [selectedPOIType]);

    const isDeleteModeRef = useRef(isDeleteMode);
    useEffect(() => { isDeleteModeRef.current = isDeleteMode; }, [isDeleteMode]);

    const [viewState, setViewState] = useState({
        zoom: 10,
        lat: 37.7749,
        lng: -122.4194
    });

    const [mapStyle, setMapStyle] = useState<MapStyle>('outdoors');

    // Track dragging to toggle cursor
    const [isDragging, setIsDragging] = useState(false);

    // Resize map when sidebar toggles
    useEffect(() => {
        if (!map.current) return;
        // Wait for CSS transition to complete (300ms) before resizing
        const timer = setTimeout(() => {
            map.current?.resize();
        }, 350);
        return () => clearTimeout(timer);
    }, [isSidebarOpen]);

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

        const m = new mapboxgl.Map({
            container: mapContainer.current!,
            style: STYLE_URLS[mapStyle],
            center: [0, 20], // Default: Globe view
            zoom: 2,
        });
        map.current = m;

        const nav = new mapboxgl.NavigationControl();
        map.current.addControl(nav, 'top-right');

        const geolocate = new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: false, // Don't fight the user by re-centering on every GPS jitter
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
                // Only auto-locate if we don't have a route yet
                if (useRouteStore.getState().waypoints.length === 0) {
                    geolocate.trigger();
                }
            }, 1000);

            map.current?.on('click', (e) => {
                // Ensure the click was actually on the map canvas and not a marker/popup child
                const target = e.originalEvent.target as HTMLElement;
                if (target.closest('.mapboxgl-marker') ||
                    target.closest('.mapboxgl-popup') ||
                    target.closest('.mapboxgl-ctrl')) {
                    return;
                }

                // If a popup is open, don't add a waypoint. Just let the click close the popup.
                if (document.querySelector('.mapboxgl-popup')) {
                    console.log('[MapClick] Blocked: Popup is open');
                    return;
                }

                const state = useRouteStore.getState();
                console.log('[MapClick] State check:', { isReadOnly: state.isReadOnly, isFetching: state.isFetching });

                if (state.isReadOnly || state.isFetching) {
                    console.warn('[MapClick] Blocked:', state.isReadOnly ? 'Read-only mode' : 'Fetching');
                    return;
                }

                const poiType = selectedPOITypeRef.current;
                if (poiType) {
                    console.log('[MapClick] Adding POI:', poiType);
                    addPOI(e.lngLat.lng, e.lngLat.lat, poiType);
                    setSelectedPOIType(null); // Reset after placement
                } else {
                    console.log('[MapClick] Adding waypoint at:', e.lngLat);
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

        // Cleanup
        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
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

        // Helper to update marker style/content
        const updateMarkerStyle = (marker: mapboxgl.Marker, wp: Waypoint, index: number) => {
            const el = marker.getElement();
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
                    color = '#64748b'; // slate-500
                }
            }

            el.style.backgroundColor = color;
            if (iconMarkup) {
                el.innerHTML = iconMarkup;
            } else {
                // Number label for route/generic poi
                el.innerHTML = `<span class="text-white text-[10px] font-bold">${index + 1}</span>`;
            }
            marker.setDraggable(!isReadOnly);

            console.log('[updateMarkerStyle]', {
                type: wp.type,
                poiType: wp.poiType,
                color,
                hasIcon: !!iconMarkup
            });
        };

        // Filter waypoints to avoid duplicates at the same location
        // Prioritize: start/end > POI > route
        const visibleWaypoints = waypoints.filter((wp, _index, arr) => {
            // Find all waypoints at this exact location
            const duplicates = arr.filter(w =>
                Math.abs(w.lat - wp.lat) < 0.00001 &&
                Math.abs(w.lng - wp.lng) < 0.00001
            );

            if (duplicates.length === 1) return true;

            // If multiple waypoints at same location, only show the highest priority one
            const hasPriority = duplicates.some(d => d.type === 'start' || d.type === 'end');
            if (hasPriority) {
                return wp.type === 'start' || wp.type === 'end';
            }

            const hasPOI = duplicates.some(d => d.type === 'poi');
            if (hasPOI) {
                return wp.type === 'poi';
            }

            // If all are routing points, show the first one
            return duplicates[0].id === wp.id;
        });

        console.log('[MapComponent] Total waypoints:', waypoints.length, 'Visible:', visibleWaypoints.length);
        console.log('[MapComponent] Visible waypoints:', visibleWaypoints.map(wp => ({
            id: wp.id.substring(0, 8),
            type: wp.type,
            poiType: wp.poiType
        })));

        // Remove markers that are no longer visible (either deleted or filtered out)
        Object.keys(markersRef.current).forEach(id => {
            if (!visibleWaypoints.find(wp => wp.id === id)) {
                console.log('[MapComponent] Removing marker:', id.substring(0, 8));
                markersRef.current[id].remove();
                delete markersRef.current[id];
            }
        });

        // Add/Update markers
        visibleWaypoints.forEach((wp) => {
            const originalIndex = waypoints.findIndex(w => w.id === wp.id);

            if (!markersRef.current[wp.id]) {
                const container = document.createElement('div');
                container.className = `w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-transform hover:scale-110 cursor-pointer`;

                const marker = new mapboxgl.Marker({
                    element: container,
                    draggable: !isReadOnly
                })
                    .setLngLat([wp.lng, wp.lat])
                    .addTo(map.current!);

                updateMarkerStyle(marker, wp, originalIndex);

                // Handle Dragging
                marker.on('dragend', () => {
                    const lngLat = marker.getLngLat();
                    updateWaypoint(wp.id, { lng: lngLat.lng, lat: lngLat.lat });
                });

                // Handle Popup (Comments, Dates, Photos)
                const popupNode = document.createElement('div');
                popupNode.className = 'p-3 min-w-[220px] max-w-[280px] flex flex-col gap-2 font-sans';

                const isCamera = wp.type === 'poi' && wp.poiType === 'camera';
                const title = wp.type === 'poi' ? ((wp.poiType || 'POI').charAt(0).toUpperCase() + (wp.poiType || 'POI').slice(1)) : 'Waypoint';

                popupNode.innerHTML = `
                    <div class="flex items-center justify-between border-b border-gray-100 pb-1.5 mb-1">
                        <div class="text-sm font-bold text-gray-800">${title}</div>
                        <button class="delete-wp-btn p-1 text-gray-400 hover:text-red-500 transition-colors" title="Delete Point">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>
                    </div>
                `;

                if (isCamera) {
                    const photoHtml = `
                        <div class="flex flex-col gap-2">
                            <div class="photo-preview-container w-full aspect-video bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer group hover:border-blue-400 transition-colors">
                                ${wp.imageUrl ? `<img src="${wp.imageUrl}" class="w-full h-full object-cover" />` : `
                                    <div class="flex flex-col items-center text-gray-400 group-hover:text-blue-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>
                                        <span class="text-[10px] font-medium mt-1">Upload Photo</span>
                                    </div>
                                `}
                            </div>
                            <input type="file" class="photo-input hidden" accept="image/*" />
                            <input type="text" class="caption-input w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Enter caption..." value="${wp.caption || ''}" />
                        </div>
                    `;
                    popupNode.insertAdjacentHTML('beforeend', photoHtml);
                } else {
                    const standardHtml = `
                        <textarea class="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[60px]" placeholder="Add a comment...">${wp.comment || ''}</textarea>
                        <div class="flex flex-col gap-1">
                            <label class="text-[10px] uppercase font-bold text-gray-400">Date</label>
                            <input type="date" class="w-full text-xs p-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" value="${wp.date || ''}" />
                        </div>
                    `;
                    popupNode.insertAdjacentHTML('beforeend', standardHtml);
                }

                // Add Done button for better UX
                popupNode.insertAdjacentHTML('beforeend', `
                    <button class="done-wp-btn w-full mt-2 py-2 bg-blue-600 text-white text-[10px] uppercase tracking-wider font-bold rounded-lg hover:bg-blue-700 transition-all shadow-sm active:scale-95">
                        Done & Save
                    </button>
                `);

                const deleteBtn = popupNode.querySelector('.delete-wp-btn')!;
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeWaypoint(wp.id);
                });

                if (isCamera) {
                    const preview = popupNode.querySelector('.photo-preview-container')!;
                    const input = popupNode.querySelector('.photo-input') as HTMLInputElement;
                    const captionInput = popupNode.querySelector('.caption-input') as HTMLInputElement;

                    preview.addEventListener('click', () => input.click());

                    input.addEventListener('change', async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                                const base64 = ev.target?.result as string;
                                updateWaypoint(wp.id, { imageUrl: base64 });
                                const img = preview.querySelector('img');
                                if (img) {
                                    img.src = base64;
                                } else {
                                    preview.innerHTML = `<img src="${base64}" class="w-full h-full object-cover" />`;
                                }
                            };
                            reader.readAsDataURL(file);
                        }
                    });

                    captionInput.addEventListener('change', () => {
                        updateWaypoint(wp.id, { caption: captionInput.value });
                    });
                } else {
                    const textarea = popupNode.querySelector('textarea')!;
                    const dateInput = popupNode.querySelector('input')!;

                    const updateMetadata = () => {
                        updateWaypoint(wp.id, {
                            comment: textarea.value,
                            date: dateInput.value
                        });
                    };

                    textarea.addEventListener('change', updateMetadata);
                    dateInput.addEventListener('change', updateMetadata);
                }

                const popup = new mapboxgl.Popup({ offset: 15, closeButton: false, closeOnClick: true })
                    .setDOMContent(popupNode);

                marker.setPopup(popup);

                // Handle Done button
                const doneBtn = popupNode.querySelector('.done-wp-btn')!;
                doneBtn.addEventListener('click', () => {
                    popup.remove();
                });

                // Handle marker click (popup or deletion)
                container.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (isDeleteModeRef.current) {
                        removeWaypoint(wp.id);
                    } else {
                        marker.togglePopup();
                    }
                });

                markersRef.current[wp.id] = marker;
            } else {
                const marker = markersRef.current[wp.id];
                marker.setLngLat([wp.lng, wp.lat]);
                updateMarkerStyle(marker, wp, originalIndex);
            }
        });
    }, [waypoints, isReadOnly]);

    return (
        <div className="relative w-full h-full">
            <div
                ref={mapContainer}
                className={`w-full h-full ${(!isReadOnly && !isDragging) ? (isDeleteMode ? '[&_.mapboxgl-canvas]:!cursor-not-allowed' : selectedPOIType ? '[&_.mapboxgl-canvas]:!cursor-copy' : '[&_.mapboxgl-canvas]:!cursor-crosshair') : ''}`}
            />

            <MapStyleSwitcher currentStyle={mapStyle} onStyleChange={setMapStyle} />

            {/* POI & Deletion Toolbar */}
            {!isReadOnly && (
                <div className="absolute bottom-10 left-4 z-10 flex flex-col gap-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200">
                    {routeId && (
                        <>
                            {[
                                { type: 'water' as POIType, icon: <Droplets size={18} />, color: 'text-blue-500', label: 'Water' },
                                { type: 'hazard' as POIType, icon: <TriangleAlert size={18} />, color: 'text-amber-500', label: 'Hazard' },
                                { type: 'closed' as POIType, icon: <CircleSlash size={18} />, color: 'text-red-500', label: 'Closed' },
                                { type: 'camera' as POIType, icon: <Camera size={18} />, color: 'text-purple-500', label: 'Photo Op' },
                            ].map((poi) => (
                                <button
                                    key={poi.type}
                                    onClick={() => {
                                        setIsDeleteMode(false);
                                        setSelectedPOIType(selectedPOIType === poi.type ? null : poi.type);
                                    }}
                                    className={`p-2.5 rounded-lg transition-all flex items-center justify-center hover:scale-110 ${selectedPOIType === poi.type ? 'bg-gray-100 ring-2 ring-blue-400' : 'hover:bg-gray-50'}`}
                                    title={poi.label}
                                >
                                    <span className={poi.color}>{poi.icon}</span>
                                </button>
                            ))}

                            <div className="h-px bg-gray-100 mx-1" />
                        </>
                    )}

                    <button
                        onClick={() => {
                            setSelectedPOIType(null);
                            setIsDeleteMode(!isDeleteMode);
                        }}
                        className={`p-2.5 rounded-lg transition-all flex items-center justify-center hover:scale-110 ${isDeleteMode ? 'bg-red-50 ring-2 ring-red-400 text-red-600' : 'text-gray-400 hover:bg-gray-50'}`}
                        title="Delete Tool"
                    >
                        <Trash2 size={18} />
                    </button>

                    {(selectedPOIType || isDeleteMode) && (
                        <button
                            onClick={() => {
                                setSelectedPOIType(null);
                                setIsDeleteMode(false);
                            }}
                            className="p-1 mt-1 text-gray-400 hover:text-gray-600 self-center"
                            title="Cancel Tool"
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
