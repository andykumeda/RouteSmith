import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useRouteStore } from '../../store/useRouteStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { mockService } from '../../lib/mockService';
import type { RouteData } from '../../lib/mockService';
import { Loader2, Trash2, Map, Globe, Lock, ArrowRight, Calendar } from 'lucide-react';

interface RouteDashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function RouteDashboard({ isOpen, onClose }: RouteDashboardProps) {
    const { user } = useAuthStore();
    const { loadFullRoute } = useRouteStore();
    const { units } = useSettingsStore();
    const [routes, setRoutes] = useState<RouteData[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            fetchRoutes();
        }
    }, [isOpen, user]);

    const fetchRoutes = async () => {
        if (!user) return;
        setIsLoading(true);
        const data = await mockService.getUserRoutes(user.id);
        setRoutes(data);
        setIsLoading(false);
    };

    const handleDelete = async (routeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this route?')) return;

        const success = await mockService.deleteRoute(routeId);
        if (success) {
            setRoutes(prev => prev.filter(r => r.id !== routeId));
        }
    };

    const loadRoute = (route: RouteData) => {
        console.log('[RouteDashboard] Loading route from dashboard:', {
            id: route.id,
            name: route.name,
            waypoints: route.waypoints?.length,
            segments: route.segments?.length,
            hasGeoJson: !!route.fullGeoJson,
            geoJsonFeatures: route.fullGeoJson?.features?.length
        });
        loadFullRoute(route);
        onClose();
    };

    const formatDistance = (meters: number) => {
        if (units === 'metric') {
            return `${(meters / 1000).toFixed(1)} km`;
        }
        return `${(meters / 1609.34).toFixed(1)} mi`;
    };

    const formatElevation = (meters: number) => {
        if (units === 'metric') {
            return `${Math.round(meters)} m gain`;
        }
        return `${Math.round(meters * 3.28084)} ft gain`;
    };

    const formatTimestamp = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">My Routes</h2>
                        <p className="text-sm text-gray-500">Manage and load your saved paths</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="animate-spin text-blue-600" size={32} />
                        </div>
                    ) : routes.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Map size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No saved routes yet.</p>
                            <p className="text-xs mt-2">Plan a route and click "Save" to build your library.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {routes.map(route => (
                                <div key={route.id} onClick={() => loadRoute(route)} className="bg-white p-4 rounded-xl border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-gray-800 truncate">{route.name}</h3>
                                            {route.isPublic ? (
                                                <span className="text-[10px] uppercase bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                                    <Globe size={10} /> Public
                                                </span>
                                            ) : (
                                                <span className="text-[10px] uppercase bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                                                    <Lock size={10} /> Private
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2">
                                            <span className="font-medium text-slate-700">{formatDistance(route.distance)}</span>
                                            <span className="text-gray-300">•</span>
                                            <span className="font-medium text-slate-700">{formatElevation(route.elevationGain)}</span>
                                            <span className="text-gray-300">•</span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {formatTimestamp(route.updatedAt || route.createdAt)}
                                            </span>
                                            {route.startLocation && (
                                                <>
                                                    <span className="text-gray-300">•</span>
                                                    <span className="truncate max-w-[150px]">{route.startLocation}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pl-4">
                                        <button
                                            onClick={(e) => handleDelete(route.id, e)}
                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            title="Delete Route"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ArrowRight size={20} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
