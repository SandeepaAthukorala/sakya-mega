import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Filter, MapPin, ChevronRight, Map, Check, X, Calendar, ArrowDownAZ, Trash2 } from 'lucide-react';
import { Visit } from '../types';
import { supabase } from '../supabaseClient';
import { format, parseISO, addDays } from 'date-fns';

const VisitListPage: React.FC = () => {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  useEffect(() => {
    const fetchVisits = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('visits')
          .select('*')
          .eq('ref_id', user?.id)
          .order('date', { ascending: false });

        if (error) {
          console.error('Error fetching visits:', error);
        }

        setVisits(data || []);
        setFilteredVisits(data || []);

        const uniqueDates = Array.from(new Set((data || []).map(visit =>
          visit.date.split('T')[0]
        ))).sort();
        setSelectedDates(uniqueDates);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchVisits();
    }
  }, [user]);

  useEffect(() => {
    let result = [...visits];

    if (searchTerm) {
      result = result.filter(visit =>
        visit.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.phone.includes(searchTerm) ||
        (visit.location.address && visit.location.address.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(visit => visit.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter(visit => visit.type === typeFilter);
    }

    if (dateFilter !== 'all') {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = addDays(new Date(), 1).toISOString().split('T')[0];

      switch (dateFilter) {
        case 'today':
          result = result.filter(visit => visit.date.split('T')[0] === today);
          break;
        case 'tomorrow':
          result = result.filter(visit => visit.date.split('T')[0] === tomorrow);
          break;
        case 'upcoming':
          result = result.filter(visit => visit.date.split('T')[0] > today);
          break;
        default:
          result = result.filter(visit => visit.date.split('T')[0] === dateFilter);
      }
    }

    setFilteredVisits(result);
  }, [visits, searchTerm, statusFilter, typeFilter, dateFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setDateFilter('all');
    setShowFilters(false);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const deleteVisit = async (visitId: string) => {
    if (window.confirm('Are you sure you want to delete this visit?')) {
      try {
        const { error } = await supabase
          .from('visits')
          .delete()
          .eq('id', visitId);

        if (error) {
          console.error('Error deleting visit:', error);
        } else {
          setVisits(visits.filter(visit => visit.id !== visitId));
        }
      } catch (error) {
        console.error('Error deleting visit:', error);
      }
    }
  };

  const getVisitCountForDate = (date: string, type?: 'Delivery' | 'Collection') => {
    return visits.filter(visit =>
      visit.date.split('T')[0] === date &&
      (!type || visit.type === type)
    ).length;
  };

  return (
    <div className="space-y-6 pt-4 pb-16 animate-fade-in">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-neutral-900">Visits</h1>
        <Link to="/visits/new" className="btn btn-primary">
          <Plus size={18} className="mr-1" /> New Visit
        </Link>
      </header>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-600">Filter by Date</h2>
          {dateFilter !== 'all' && (
            <button
              onClick={() => setDateFilter('all')}
              className="text-xs text-accent hover:underline"
            >
              Clear date filter
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedDates.map(date => {
            const isSelected = dateFilter === date;
            const deliveryCount = getVisitCountForDate(date, 'Delivery');
            const collectionCount = getVisitCountForDate(date, 'Collection');

            return (
              <button
                key={date}
                onClick={() => setDateFilter(isSelected ? 'all' : date)}
                className={`inline-flex flex-col items-start p-2 rounded-md border ${isSelected
                  ? 'border-accent bg-accent/5 text-accent'
                  : 'border-neutral-200 hover:border-accent/50'
                  }`}
              >
                <span className="text-sm font-medium">{formatDate(date)}</span>
                <div className="flex gap-2 mt-1">
                  {deliveryCount > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">
                      {deliveryCount} Delivery
                    </span>
                  )}
                  {collectionCount > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-warning/10 text-warning">
                      {collectionCount} Collection
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-neutral-500" />
          </div>
          <input
            type="text"
            placeholder="Search by name, phone or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary py-1 px-3 text-sm"
          >
            <Filter size={16} className="mr-1" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>

          {(statusFilter !== 'all' || typeFilter !== 'all') && (
            <button
              onClick={clearFilters}
              className="text-sm text-accent hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-neutral-50 rounded-md border border-neutral-200 animate-fade-in">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Types</option>
                <option value="Delivery">Delivery</option>
                <option value="Collection">Collection</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm text-neutral-600">{filteredVisits.length} visits found</p>

          <Link to="/map" className="btn btn-outline py-1 px-3 text-sm">
            <Map size={16} className="mr-1" /> View on Map
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent mx-auto"></div>
            <p className="mt-2 text-neutral-600">Loading visits...</p>
          </div>
        ) : filteredVisits.length > 0 ? (
          <div className="space-y-3">
            {filteredVisits.map((visit) => (
              <div
                key={visit.id}
                className={`card border-l-4 ${visit.status === 'Completed'
                  ? 'border-success'
                  : visit.status === 'Pending'
                    ? 'border-warning'
                    : 'border-error'
                  }`}
              >
                <div className="flex justify-between">
                  <div>
                    <div className="flex items-center">
                      <h3 className="font-medium">{visit.buyerName}</h3>
                      <span className="ml-2 text-xs uppercase px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                        {visit.type}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600 flex items-center mt-1">
                      <MapPin size={14} className="mr-1 flex-shrink-0" />
                      {visit.location.address || 'No address provided'}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-sm text-neutral-600">
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        {formatDate(visit.date)}
                      </div>
                      <div>
                        <ArrowDownAZ size={14} className="mr-1 inline-block" />
                        {visit.notes || 'No notes'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex items-center text-xs px-2 py-1 rounded-full ${visit.status === 'Completed'
                          ? 'bg-success/10 text-success'
                          : visit.status === 'Pending'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-error/10 text-error'
                          }`}
                      >
                        {visit.status === 'Completed' && <Check size={12} className="mr-1" />}
                        {visit.status === 'Cancelled' && <X size={12} className="mr-1" />}
                        {visit.status}
                      </span>
                      <button
                        onClick={() => deleteVisit(visit.id)}
                        className="p-1 text-neutral-400 hover:text-error rounded-full hover:bg-error/10"
                        title="Delete visit"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${visit.location.lat},${visit.location.lng}`}
                      className="text-accent text-sm mt-2 flex items-center hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin size={14} className="mr-1" /> Navigate
                    </a>
                    <div className="mt-2 flex items-center text-neutral-400 hover:text-accent">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card py-8 text-center">
            <p className="text-neutral-600 mb-4">No visits found matching your filters</p>
            <button onClick={clearFilters} className="btn btn-primary">
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitListPage;
