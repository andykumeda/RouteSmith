import { useState, useEffect } from 'react';
import { Search, MapPin, Ruler, Mountain, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { mockService } from '../../lib/mockService';
import type { RouteData } from '../../lib/mockService';
import { useSettingsStore } from '../../store/useSettingsStore';

interface RouteSearchProps {
    onSelectRoute: (route: RouteData) => void;
}

export const RouteSearch = ({ onSelectRoute }: RouteSearchProps) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<RouteData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Filters
    const [distFilter, setDistFilter] = useState<'any' | 'short' | 'medium' | 'long'>('any');
    const [elevFilter, setElevFilter] = useState<'any' | 'flat' | 'hilly' | 'steep'>('any');

    const { units } = useSettingsStore();

    useEffect(() => {
        // Debounce search
        const timer = setTimeout(() => {
            performSearch();
        }, 500);

        return () => clearTimeout(timer);
    }, [query, distFilter, elevFilter]);

    const performSearch = async () => {
        setIsLoading(true);

        // Convert filters to numeric ranges
        let filters: any = {};

        if (distFilter === 'short') { filters.maxDist = 5000; } // < 5km
        else if (distFilter === 'medium') { filters.minDist = 5000; filters.maxDist = 15000; } // 5-15km
        else if (distFilter === 'long') { filters.minDist = 15000; } // > 15km

        if (elevFilter === 'flat') { filters.maxElev = 100; } // < 100m
        else if (elevFilter === 'hilly') { filters.minElev = 100; filters.maxElev = 500; } // 100-500m
        else if (elevFilter === 'steep') { filters.minElev = 500; } // > 500m

        const data = await mockService.searchRoutes(query, filters);
        setResults(data);
        setIsLoading(false);
    };

    const formatDist = (meters: number) => {
        if (units === 'metric') return `${(meters / 1000).toFixed(1)} km`;
        return `${(meters / 1609.34).toFixed(1)} mi`;
    };

    const formatElev = (meters: number) => {
        if (units === 'metric') return `${Math.round(meters)} m`;
        return `${Math.round(meters * 3.28084)} ft`;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Search Header */}
            <div className="p-4 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search routes, locations..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-sm font-medium"
                    />
                </div>

                {/* Filter Toggle */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors"
                >
                    {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>

                {/* Filters Area */}
                {showFilters && (
                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1">
                        <div>
                            <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Distance</span>
                            <select
                                value={distFilter}
                                onChange={(e) => setDistFilter(e.target.value as any)}
                                className="w-full text-xs p-1.5 rounded border border-gray-200 bg-gray-50 focus:border-blue-500 outline-none"
                            >
                                <option value="any">Any Distance</option>
                                <option value="short">Short (&lt; 5km)</option>
                                <option value="medium">Medium (5-15km)</option>
                                <option value="long">Long (&gt; 15km)</option>
                            </select>
                        </div>
                        <div>
                            <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Elevation</span>
                            <select
                                value={elevFilter}
                                onChange={(e) => setElevFilter(e.target.value as any)}
                                className="w-full text-xs p-1.5 rounded border border-gray-200 bg-gray-50 focus:border-blue-500 outline-none"
                            >
                                <option value="any">Any Elevation</option>
                                <option value="flat">Flat (&lt; 100m)</option>
                                <option value="hilly">Hilly (100-500m)</option>
                                <option value="steep">Steep (&gt; 500m)</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-blue-500" size={24} />
                    </div>
                ) : results.length > 0 ? (
                    results.map((route) => (
                        <div
                            key={route.id}
                            onClick={() => onSelectRoute(route)}
                            className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                        >
                            <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors mb-1">{route.name}</h3>

                            <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                                <MapPin size={12} className="shrink-0" />
                                <span className="truncate">{route.startLocation || 'Unknown Location'}</span>
                            </div>

                            <div className="flex items-center gap-4 border-t border-gray-50 pt-2">
                                <span className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                                    <Ruler size={12} className="text-gray-400" />
                                    {formatDist(route.distance)}
                                </span>
                                <span className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                                    <Mountain size={12} className="text-gray-400" />
                                    {formatElev(route.elevationGain)}
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-gray-400 text-sm">
                        <p>No routes found.</p>
                        <p className="text-xs mt-1">Try adjusting your filters or search terms.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
