import { useState, useEffect } from 'react';
import MapComponent from './components/map/MapComponent';
import { useRouteStore } from './store/useRouteStore';
import { useSettingsStore } from './store/useSettingsStore';
import { useAuthStore } from './store/useAuthStore';
import ElevationProfile from './components/layout/ElevationProfile';
import AuthModal from './components/auth/AuthModal';
import RouteDashboard from './components/dashboard/RouteDashboard';
import SettingsModal from './components/settings/SettingsModal';
import RouteImportModal from './components/modals/RouteImportModal';
import { Loader2, Settings, Ruler, Mountain, Download, Upload, User as UserIcon, LogOut, Save, BookOpen, Share2, Undo, Plus } from 'lucide-react';
import { exportToGpx, parseGpx } from './lib/gpxUtils';
import { mockService } from './lib/mockService';
import { getPlaceName } from './lib/mapboxUtils';
import { RouteSearch } from './components/layout/RouteSearch';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [isDashboardOpen, setDashboardOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    waypoints,
    clearRoute,
    undoLastWaypoint,
    totalDistance,
    totalElevationGain,
    isFetching,
    elevationProfile,
    routeGeoJson,
    setRouteFromImport,
    routeName,
    setRouteName,
    routeId,
    setRouteId,
    isReadOnly,
    setReadOnly,
    minElevation,
    maxElevation
  } = useRouteStore();

  const { units } = useSettingsStore();
  const { user, logout, checkSession } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'my_routes' | 'search'>('my_routes');

  useEffect(() => {
    checkSession();
    mockService.seedPublicRoutes(); // Seed data

    // Check for route param
    const params = new URLSearchParams(window.location.search);
    const urlRouteId = params.get('route');
    if (urlRouteId) {
      loadSharedRoute(urlRouteId);
    }
  }, [checkSession]);

  const loadSharedRoute = async (id: string) => {
    const route = await mockService.getRouteById(id);
    if (route && route.fullGeoJson) {
      setRouteFromImport(route.fullGeoJson);
      setRouteName(route.name);
      setRouteId(route.id); // Track ID
      setReadOnly(true); // Default to read-only for shared/searched routes
      setIsSidebarOpen(true);
    } else {
      console.error("Route not found");
      alert("Route not found");
    }
  };

  const handleRouteSelect = (route: any) => {
    if (route.fullGeoJson) {
      setRouteFromImport(route.fullGeoJson);
      setRouteName(route.name);
      setRouteId(route.id);
      setReadOnly(true); // View mode

      // Auto-switch to "My Routes" view to show stats? Or stay in search?
      // Staying in search allows browsing. But we need to see stats.
      // Let's keep the user in the search tab but the map updates.
      // Actually, standard behavior might be to show details.
      // For now, let's just load it on the map.
    }
  };

  const handleShare = async () => {
    if (!user) {
      alert("Please log in to save and share routes.");
      return;
    }

    // If no routeId, we haven't saved it yet (or edited a new one)
    if (!routeId) {
      alert("Please save the route first to generate a link.");
      return;
    }

    const url = `${window.location.origin}/?route=${routeId}`;
    await navigator.clipboard.writeText(url);
    alert(`Link copied to clipboard!\n${url}`);
  };

  const handleSave = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (waypoints.length < 2) return;

    setIsSaving(true);

    try {
      const {
        routeId,
        waypoints: currentWaypoints,
        segments,
        elevationProfile: currentProfile,
        minElevation: currentMin,
        maxElevation: currentMax,
        routeName: currentName,
        totalDistance: currentDist,
        totalElevationGain: currentGain,
        routeGeoJson: currentGeoJson
      } = useRouteStore.getState();

      // Get location string for metadata
      let startLocation = "Unknown Location";
      if (currentWaypoints.length > 0) {
        try {
          const loc = await getPlaceName(currentWaypoints[0].lng, currentWaypoints[0].lat);
          if (loc) startLocation = loc;
        } catch (err) {
          console.warn('[handleSave] Failed to get place name:', err);
          // Continue with "Unknown Location"
        }
      }

      const payload = {
        name: currentName,
        isPublic: false,
        distance: currentDist,
        elevationGain: currentGain,
        startLocation: startLocation,
        fullGeoJson: currentGeoJson || { type: 'FeatureCollection', features: [] },
        waypoints: currentWaypoints,
        segments: segments,
        elevationProfile: currentProfile,
        minElevation: currentMin,
        maxElevation: currentMax
      };

      console.log('[handleSave] Saving route:', {
        name: payload.name,
        waypoints: payload.waypoints.length,
        segments: payload.segments.length,
        hasGeoJson: !!payload.fullGeoJson,
        geoJsonFeatures: payload.fullGeoJson?.features?.length,
        routeId: routeId
      });

      const response = routeId
        ? await mockService.updateRoute(routeId, payload)
        : await mockService.saveRoute(user.id, payload);

      const { error, route } = response;

      if (!error && route) {
        const wasReadOnly = isReadOnly;
        setRouteId(route.id); // Update ID in store

        if (wasReadOnly) {
          alert('Route saved successfully!');
        } else {
          alert('Route saved successfully! You can continue editing or click "Edit Route" to modify it later.');
        }
      } else {
        console.error('[handleSave] Save failed:', error);
        alert('Failed to save route: ' + (error || 'Unknown error'));
      }
    } catch (err) {
      console.error('[handleSave] Exception during save:', err);
      alert('Error saving route: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const { waypoints } = useRouteStore.getState();
    const gpxString = exportToGpx(routeGeoJson, elevationProfile, routeName, waypoints);
    if (!gpxString) return;
    const safeName = routeName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'route';
    const blob = new Blob([gpxString], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}.gpx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const geoJson = await parseGpx(file);
    if (geoJson) {
      setRouteFromImport(geoJson);
      setImportModalOpen(true);
    }
    e.target.value = '';
  };

  const distanceDisplay = units === 'metric'
    ? `${(totalDistance / 1000).toFixed(2)} km`
    : `${(totalDistance / 1609.34).toFixed(2)} mi`;

  const elevationDisplay = units === 'metric'
    ? `${Math.round(totalElevationGain)} m`
    : `${Math.round(totalElevationGain * 3.28084)} ft`;

  const highLowDisplay = units === 'metric'
    ? { high: `${Math.round(maxElevation ?? 0)} m`, low: `${Math.round(minElevation ?? 0)} m` }
    : { high: `${Math.round((maxElevation ?? 0) * 3.28084)} ft`, low: `${Math.round((minElevation ?? 0) * 3.28084)} ft` };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100 font-sans text-gray-900">
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
      <RouteDashboard isOpen={isDashboardOpen} onClose={() => setDashboardOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} />
      <RouteImportModal
        isOpen={isImportModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSave={handleSave}
      />

      {/* Sidebar (Left) */}
      <div
        className={`bg-white transition-all duration-300 ease-in-out z-30 flex flex-col overflow-hidden ${isSidebarOpen ? 'w-80 border-r border-gray-200 shadow-xl' : 'w-0'}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex flex-col gap-3 bg-white">
          {/* Logo Branding */}
          <div className="flex flex-col mb-1 px-1">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="RouteSmith" className="w-8 h-8 object-contain" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">RouteSmith</h1>
            </div>
            <p className="text-xs text-gray-400 font-medium tracking-wide ml-10 -mt-1">Craft Your Route</p>
          </div>
          {/* User Profile Bar */}
          <div className="flex items-center justify-between">
            {user ? (
              <div className="flex items-center gap-2 cursor-pointer hover:opacity-80" onClick={() => setDashboardOpen(true)}>
                <img src={user.avatar} alt="Avatar" className="w-8 h-8 rounded-full border border-gray-200" />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-800 leading-none">{user.username}</span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                <UserIcon size={16} /> Log In
              </button>
            )}

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (confirm('Start a new route? Unsaved changes will be lost.')) {
                    clearRoute();
                  }
                }}
                className="p-2 rounded-full hover:bg-green-50 text-green-600 transition-colors"
                title="Create New Route"
              >
                <Plus size={18} />
              </button>
              {user && (
                <>
                  <button
                    onClick={() => setDashboardOpen(true)}
                    className="p-2 rounded-full hover:bg-blue-50 text-blue-600 transition-colors"
                    title="My Saved Routes"
                  >
                    <BookOpen size={18} />
                  </button>
                  <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Log Out">
                    <LogOut size={16} />
                  </button>
                </>
              )}
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
                title="Settings"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>

          {/* Mock Tab Switcher (Visible only if we have tabs) */}
          <div className="flex p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setActiveTab('my_routes')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'my_routes' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Plan & Stats
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'search' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Discover
            </button>
          </div>

          {activeTab === 'my_routes' && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-50">
              <input
                type="text"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                className="text-lg font-bold text-gray-800 tracking-tight bg-transparent border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none w-full truncate placeholder-gray-300"
                placeholder="Name your route..."
              />
              {isFetching && <Loader2 className="animate-spin text-blue-600 shrink-0" size={18} />}
            </div>
          )}
        </div>

        {/* Sidebar Content Area */}
        {activeTab === 'search' ? (
          <div className="flex-1 overflow-hidden">
            <RouteSearch onSelectRoute={handleRouteSelect} />
          </div>
        ) : (
          /* Original Stats Content */
          <div className="p-4 flex-1 overflow-y-auto">
            {/* Primary Stats Card */}
            <div className="mb-6 bg-slate-50 rounded-xl p-5 border border-slate-100 shadow-sm">
              <div className="grid grid-cols-1 gap-6">
                {/* Distance */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Ruler size={14} /> Distance
                    </div>
                    <div className="text-3xl font-extrabold text-slate-800 tracking-tight">
                      {distanceDisplay}
                    </div>
                  </div>
                </div>

                {/* Elevation Gain */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Mountain size={14} /> Gain
                    </div>
                    <div className="text-3xl font-extrabold text-slate-800 tracking-tight">
                      {elevationDisplay}
                    </div>
                  </div>

                  {/* High/Low */}
                  <div className="border-t border-slate-200/60 pt-4 mt-2 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Highest</div>
                      <div className="text-sm font-bold text-slate-700">{highLowDisplay.high}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Lowest</div>
                      <div className="text-sm font-bold text-slate-700">{highLowDisplay.low}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {/* Mode Toggle */}
              {isReadOnly ? (
                <button
                  onClick={() => setReadOnly(false)}
                  className="w-full py-3 px-4 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all font-bold shadow-md shadow-amber-200 flex items-center justify-center gap-2"
                >
                  <Settings size={20} /> Edit Route
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                    <button
                      onClick={() => useRouteStore.getState().setManualMode(false)}
                      className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${!useRouteStore.getState().isManualMode
                        ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                        : 'text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span> Auto
                    </button>
                    <button
                      onClick={() => useRouteStore.getState().setManualMode(true)}
                      className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${useRouteStore.getState().isManualMode
                        ? 'bg-white text-orange-600 shadow-sm border border-gray-200'
                        : 'text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span> Manual
                    </button>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={isSaving || !user}
                    className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold shadow-md shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Save to My Routes
                  </button>
                </div>
              )}

              <button
                onClick={handleShare}
                className="w-full py-2 px-4 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors font-semibold shadow-sm flex items-center justify-center gap-2"
              >
                <Share2 size={18} /> Share Route
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleExport}
                  className="py-2 px-4 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm transition-colors flex items-center justify-center gap-2"
                  disabled={waypoints.length < 2}
                >
                  <Download size={16} /> Export
                </button>
                <label className="py-2 px-4 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer">
                  <Upload size={16} /> Import
                  <input
                    type="file"
                    accept=".gpx"
                    className="hidden"
                    onChange={handleImport}
                  />
                </label>
              </div>

              {/* Undo / Clear Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => undoLastWaypoint()}
                  className="flex-1 py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
                  disabled={waypoints.length === 0 || isReadOnly}
                >
                  <Undo size={16} /> Undo
                </button>
                <button
                  onClick={clearRoute}
                  className="flex-1 py-3 px-4 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all text-sm font-semibold shadow-sm flex items-center justify-center gap-2"
                  disabled={waypoints.length === 0}
                >
                  <LogOut size={16} className="rotate-180" /> Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar Footer/Toggle Hint */}
        {!isSidebarOpen && (
          <div className="absolute top-4 left-4 z-40">
          </div>
        )}
      </div>

      {/* Main Content (Right) - Split Screen */}
      <div className="flex-1 flex flex-col relative h-full w-full overflow-hidden">

        {/* Sidebar Toggle Button (floating on map) */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute top-4 left-4 z-20 bg-white p-2.5 rounded-lg shadow-md hover:bg-gray-50 text-gray-700 border border-gray-200 transition-colors"
        >
          {isSidebarOpen ? '←' : '→'}
        </button>

        {/* Top: Map */}
        <div className="flex-grow w-full relative min-h-[50%]">
          <MapComponent isSidebarOpen={isSidebarOpen} />
        </div>

        {/* Bottom: Elevation Profile */}
        <div className="h-64 bg-white border-t border-gray-200 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 relative pointer-events-auto">
          <div className="h-full w-full p-4 flex flex-col">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex-none">Elevation Profile</h3>
            <div className="flex-1 min-h-0">
              <ElevationProfile data={elevationProfile} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
