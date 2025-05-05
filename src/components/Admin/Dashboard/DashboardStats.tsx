import React from 'react';
import { BarChart2, User, Route as RouteIcon, Package } from 'lucide-react';

interface DashboardStatsProps {
    stats: {
        today: number;
        thisWeek: number;
        completed: number;
        total: number;
        refs: number;
        routes: number;
        items: number;
    };
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
    const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Visits Stats Card */}
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-700">Visits</h3>
                    <BarChart2 className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                    <div>
                        <p className="text-sm text-gray-500">Today</p>
                        <p className="text-2xl font-bold">{stats.today}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">This Week</p>
                        <p className="text-2xl font-bold">{stats.thisWeek}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Completed</p>
                        <p className="text-2xl font-bold">{stats.completed}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Completion Rate</p>
                        <p className="text-2xl font-bold">{completionRate}%</p>
                    </div>
                </div>
            </div>

            {/* Refs Stats Card */}
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-700">Refs</h3>
                    <User className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-4">
                    <p className="text-sm text-gray-500">Total Refs</p>
                    <p className="text-2xl font-bold">{stats.refs}</p>
                </div>
            </div>

            {/* Routes Stats Card */}
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-700">Routes</h3>
                    <RouteIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-4">
                    <p className="text-sm text-gray-500">Total Routes</p>
                    <p className="text-2xl font-bold">{stats.routes}</p>
                </div>
            </div>

            {/* Items Stats Card */}
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-700">Items</h3>
                    <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-4">
                    <p className="text-sm text-gray-500">Total Items</p>
                    <p className="text-2xl font-bold">{stats.items}</p>
                </div>
            </div>
        </div>
    );
};

export default DashboardStats;