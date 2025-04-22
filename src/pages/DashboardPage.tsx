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
    </div>
  );
};

export default DashboardPage;
