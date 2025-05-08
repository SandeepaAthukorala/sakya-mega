import React from 'react';
import { BarChart2, User, Route as RouteIcon, Package, Calendar, CalendarCheck, CheckCircle, Percent } from 'lucide-react';

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
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-100 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-700">Visits Overview</h3>
                    <div className="p-1.5 bg-blue-50 rounded-md">
                        <BarChart2 className="h-5 w-5 text-blue-500" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 bg-gray-50 rounded-md flex flex-col items-start">
                        <div className="flex items-center gap-1 mb-0.5">
                            <Calendar className="h-3.5 w-3.5 text-blue-500" />
                            <p className="text-xs font-medium text-gray-500">Today</p>
                        </div>
                        <p className="text-xl font-bold text-gray-700">{stats.today}</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-md flex flex-col items-start">
                        <div className="flex items-center gap-1 mb-0.5">
                            <CalendarCheck className="h-3.5 w-3.5 text-green-500" />
                            <p className="text-xs font-medium text-gray-500">This Week</p>
                        </div>
                        <p className="text-xl font-bold text-gray-700">{stats.thisWeek}</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-md flex flex-col items-start">
                        <div className="flex items-center gap-1 mb-0.5">
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                            <p className="text-xs font-medium text-gray-500">Completed</p>
                        </div>
                        <p className="text-xl font-bold text-gray-700">{stats.completed}</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-md flex flex-col items-start">
                        <div className="flex items-center gap-1 mb-0.5">
                            <Percent className="h-3.5 w-3.5 text-purple-600" />
                            <p className="text-xs font-medium text-gray-500">Completion</p>
                        </div>
                        <p className="text-xl font-bold text-gray-700">{completionRate}%</p>
                    </div>
                </div>
            </div>

            {/* Refs Stats Card */}
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-100 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-700">Referrers</h3>
                    <div className="p-1.5 bg-green-50 rounded-md">
                        <User className="h-5 w-5 text-green-500" />
                    </div>
                </div>
                <div className="mt-4 flex flex-col items-center justify-center">
                    <p className="text-2xl sm:text-3xl font-bold text-gray-700 mb-1">{stats.refs}</p>
                    <p className="text-xs font-medium text-gray-500">Total Active Referrers</p>
                </div>
            </div>

            {/* Routes Stats Card */}
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-100 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-700">Routes</h3>
                    <div className="p-1.5 bg-purple-50 rounded-md">
                        <RouteIcon className="h-5 w-5 text-purple-500" />
                    </div>
                </div>
                <div className="mt-4 flex flex-col items-center justify-center">
                    <p className="text-2xl sm:text-3xl font-bold text-gray-700 mb-1">{stats.routes}</p>
                    <p className="text-xs font-medium text-gray-500">Total Active Routes</p>
                </div>
            </div>

            {/* Items Stats Card */}
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-100 hover:shadow-lg transition-shadow duration-300">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-700">Items</h3>
                    <div className="p-1.5 bg-amber-50 rounded-md">
                        <Package className="h-5 w-5 text-amber-500" />
                    </div>
                </div>
                <div className="mt-4 flex flex-col items-center justify-center">
                    <p className="text-2xl sm:text-3xl font-bold text-gray-700 mb-1">{stats.items}</p>
                    <p className="text-xs font-medium text-gray-500">Total Inventory Items</p>
                </div>
            </div>
        </div>
    );
};

export default DashboardStats;