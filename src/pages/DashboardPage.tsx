import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, BarChart2, Navigation, Plus, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Visit } from '../types';
import { supabase } from '../supabaseClient';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [todayVisits, setTodayVisits] = useState<Visit[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    completed: 0,
    total: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVisits = async () => {
      setIsLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('visits')
          .select('*')
          .eq('date', today)
          .eq('ref_id', user?.id);
        
        if (error) {
          console.error('Error fetching visits:', error);
        }
        
        setTodayVisits(data || []);
        
        const pending = (data || []).filter(v => v.status === 'Pending').length;
        const completed = (data || []).filter(v => v.status === 'Completed').length;
        
        setStats({
          pending,
          completed,
          total: (data || []).length
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchVisits();
    }
  }, [user]);

  const getCompletionPercentage = () => {
    if (stats.total === 0) return 0;
    return Math.round((stats.completed / stats.total) * 100);
  };

  return (
    <div className="space-y-6 pt-4 pb-16 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">
          Welcome, {user?.name}
        </h1>
        <p className="text-neutral-600 mt-1">
          {format(new Date(), 'EEEE, MMMM do, yyyy')}
        </p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card bg-white px-4 py-5">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-accent/10 text-accent">
              <MapPin size={24} />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-neutral-500">Today's Visits</h2>
              <p className="text-2xl font-semibold text-neutral-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="card bg-white px-4 py-5">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-success/10 text-success">
              <BarChart2 size={24} />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-neutral-500">Completion</h2>
              <p className="text-2xl font-semibold text-neutral-900">{getCompletionPercentage()}%</p>
            </div>
          </div>
        </div>
        
        {user?.role === 'Admin' ? (
          <div className="card bg-white px-4 py-5">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-accent/10 text-accent">
                <Users size={24} />
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-neutral-500">Active Refs</h2>
                <p className="text-2xl font-semibold text-neutral-900">4</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="card bg-white px-4 py-5">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-warning/10 text-warning">
                <Calendar size={24} />
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-neutral-500">Pending</h2>
                <p className="text-2xl font-semibold text-neutral-900">{stats.pending}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link to="/visits/new" className="card text-center py-6 hover:shadow-elevated transition-shadow">
          <Plus size={24} className="mx-auto text-accent" />
          <span className="block mt-2 font-medium">New Visit</span>
        </Link>
        
        <Link to="/map" className="card text-center py-6 hover:shadow-elevated transition-shadow">
          <Navigation size={24} className="mx-auto text-accent" />
          <span className="block mt-2 font-medium">View Route</span>
        </Link>
        
        <Link to="/visits" className="card text-center py-6 hover:shadow-elevated transition-shadow">
          <MapPin size={24} className="mx-auto text-accent" />
          <span className="block mt-2 font-medium">All Visits</span>
        </Link>
        
        {user?.role === 'Admin' ? (
          <Link to="/admin" className="card text-center py-6 hover:shadow-elevated transition-shadow">
            <BarChart2 size={24} className="mx-auto text-accent" />
            <span className="block mt-2 font-medium">Analytics</span>
          </Link>
        ) : (
          <a 
            href="https://maps.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="card text-center py-6 hover:shadow-elevated transition-shadow"
          >
            <Navigation size={24} className="mx-auto text-accent" />
            <span className="block mt-2 font-medium">Navigate</span>
          </a>
        )}
      </div>

      {/* Today's Visits */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-neutral-900">Today's Visits</h2>
          <Link to="/visits" className="text-accent text-sm font-medium hover:underline">
            View All
          </Link>
        </div>
        
        {isLoading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent mx-auto"></div>
            <p className="mt-2 text-neutral-600">Loading visits...</p>
          </div>
        ) : todayVisits.length > 0 ? (
          <div className="space-y-3">
            {todayVisits.map((visit) => (
              <div 
                key={visit.id} 
                className={`card border-l-4 ${
                  visit.status === 'Completed' 
                    ? 'border-success' 
                    : visit.status === 'Pending' 
                      ? 'border-warning' 
                      : 'border-error'
                }`}
              >
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-medium">{visit.buyerName}</h3>
                    <p className="text-sm text-neutral-600">
                      {visit.location.address || 'No address provided'}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium 
                        ${visit.type === 'Sample' ? 'bg-sampleBlue text-white' : 
                          visit.type === 'Sittu' ? 'bg-sittuRose text-white' : 
                          visit.type === 'Over' ? 'bg-overGreen text-neutral-800' : 
                          'bg-neutral-100 text-neutral-700'}`}>
                        {visit.type}
                      </span>
                       • {visit.phone}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span 
                      className={`text-xs px-2 py-1 rounded-full ${
                        visit.status === 'Completed' 
                          ? 'bg-success/10 text-success' 
                          : visit.status === 'Pending' 
                            ? 'bg-warning/10 text-warning' 
                            : 'bg-error/10 text-error'
                      }`}
                    >
                      {visit.status}
                    </span>
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${visit.location.lat},${visit.location.lng}`}
                      className="text-accent text-sm mt-2 flex items-center hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Navigation size={14} className="mr-1" /> Navigate
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card py-8 text-center">
            <p className="text-neutral-600 mb-4">No visits scheduled for today</p>
            <Link to="/visits/new" className="btn btn-primary">
              <Plus size={18} className="mr-2" /> Add New Visit
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
