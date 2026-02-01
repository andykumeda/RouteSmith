import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { useRouteStore } from '../../store/useRouteStore';

interface ElevationPoint {
    distance: number;
    elevation: number;
}

import { useSettingsStore } from '../../store/useSettingsStore';

interface ElevationProfileProps {
    data: ElevationPoint[];
}

const ElevationProfile: React.FC<ElevationProfileProps> = ({ data }) => {
    const { setHoveredDistance, hoveredDistance } = useRouteStore();
    const { units } = useSettingsStore();

    if (!data || data.length === 0) {
        return (
            <div className="h-40 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <span className="text-gray-400 text-sm">No elevation data available</span>
            </div>
        );
    }

    // Format data for chart
    const chartData = data.map(d => ({
        dist: units === 'metric'
            ? (d.distance / 1000).toFixed(2)  // km
            : (d.distance / 1609.34).toFixed(2), // miles
        elevation: units === 'metric'
            ? Math.round(d.elevation) // meters
            : Math.round(d.elevation * 3.28084), // feet
        distance: d.distance // keep raw meters for sync
    }));

    const handleMouseMove = (e: any) => {
        let dist = null;

        // Try standard payload
        if (e && e.activePayload && e.activePayload.length > 0) {
            dist = e.activePayload[0].payload.distance;
        }
        // Fallback to index
        else if (e && e.activeTooltipIndex !== undefined && chartData[e.activeTooltipIndex]) {
            dist = chartData[e.activeTooltipIndex].distance;
        }

        if (dist !== null) {
            setHoveredDistance(dist);
        }
    };

    const handleMouseLeave = () => {
        setHoveredDistance(null);
    };

    return (
        <div className="w-full h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={chartData}
                    margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="dist"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(val) => `${val}${units === 'metric' ? 'km' : 'mi'}`}
                        minTickGap={30}
                    />
                    <YAxis
                        width={40}
                        tick={{ fontSize: 10 }}
                        domain={['auto', 'auto']}
                    />
                    <Tooltip
                        contentStyle={{ fontSize: '12px', padding: '5px' }}
                        formatter={(value: any) => [`${value}${units === 'metric' ? 'm' : 'ft'}`, 'Elevation']}
                        labelFormatter={(label: any) => `Distance: ${label}${units === 'metric' ? 'km' : 'mi'}`}
                    />
                    <Area
                        type="monotone"
                        dataKey="elevation"
                        stroke="#2563eb"
                        fill="#3b82f6"
                        fillOpacity={0.3}
                    />
                    {hoveredDistance !== null && (
                        <ReferenceLine
                            x={(hoveredDistance / (units === 'metric' ? 1000 : 1609.34)).toFixed(2)}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            strokeWidth={2}
                        />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ElevationProfile;
