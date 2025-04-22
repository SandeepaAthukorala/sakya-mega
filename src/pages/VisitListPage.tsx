import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BarChart2, MapPin, Calendar, Filter, Download, User, RefreshCw, ChevronDown, ChevronUp, Check, X, Trash2 } from 'lucide-react';
import { Visit, User as UserType } from '../types';
import { supabase } from '../supabaseClient';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [refFilter, setRefFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [users, setUsers] = useState<UserType[]>([]);
  const [refs, setRefs] = useState<UserType[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // This week range for stats
  const thisWeekStart = startOfWeek(new Date()).toISOString().split('T')[0];
  const thisWeekEnd = endOfWeek(new Date()).toISOString().split('T')[0];

  // Fetch visits
  useEffect(() => {
    const fetchVisits = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('visits')
          .select('*')
          .order('date', { ascending: false });

        if (error) {
          console.error('Error fetching visits:', error);
        }

        setVisits(data || []);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*');

        if (error) {
          console.error('Error fetching users:', error);
        }

        setUsers(data || []);
        setRefs((data || []).filter(user => user.role === 'Ref'));
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchVisits();
    fetchUsers();
  }, []);
  
  // Filtered and sorted visits
  const filteredVisits = visits.filter(visit => {
    // Date range filter
    const visitDate = visit.date.split('T')[0];
    const isInDateRange = visitDate >= dateRange.start && visitDate <= dateRange.end;
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || visit.status === statusFilter;
    
    // Type filter
    const matchesType = typeFilter === 'all' || visit.type === typeFilter;
    
    // Ref filter
    const matchesRef = refFilter === 'all' || visit.refId === refFilter;
    
    return isInDateRange && matchesStatus && matchesType && matchesRef;
  }).sort((a, b) => {
    // Handle sorting
    if (sortField === 'date') {
      return sortDirection === 'asc' 
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date);
    } else if (sortField === 'name') {
      return sortDirection === 'asc'
        ? a.buyerName.localeCompare(b.buyerName)
        : b.buyerName.localeCompare(a.buyerName);
    } else if (sortField === 'status') {
      return sortDirection === 'asc'
        ? a.status.localeCompare(b.status)
        : b.status.localeCompare(a.status);
    }
    return 0;
  });
  
  // Calculate statistics
  const stats = {
    today: visits.filter(v => v.date.split('T')[0] === new Date().toISOString().split('T')[0]).length,
    thisWeek: visits.filter(v => {
      const visitDate = v.date.split('T')[0];
      return visitDate >= thisWeekStart && visitDate <= thisWeekEnd;
    }).length,
    completed: visits.filter(v => v.status === 'Completed').length,
    pending: visits.filter(v => v.status === 'Pending').length,
    total: visits.length,
  };
  
  const completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;
  
  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Export as CSV
  const exportCSV = () => {
    // In a real implementation, this would generate a CSV file
    // For this mockup, we'll just show a message
    alert('Exporting visits as CSV...');
  };
  
  // Set this week as date range
  const setThisWeekRange = () => {
    setDateRange({
      start: thisWeekStart,
      end: thisWeekEnd,
    });
  };
  
  // Set today as date range
  const setTodayRange = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateRange({
      start: today,
      end: today,
    });
  };
  
  // Reset filters
  const resetFilters = () => {
    setDateRange({
      start: new Date().toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    });
    setStatusFilter('all');
    setTypeFilter('all');
    setRefFilter('all');
  };

  // Format date
  const formatDateDisplay = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const handleDeleteRef = async (refId: string) => {
    setIsDeleting(refId);
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', refId);

      if (error) {
        console.error('Error deleting ref:', error);
        alert('Failed to delete ref. Please try again.');
      } else {
        setRefs(refs.filter(ref => ref.id !== refId));
        alert('Ref deleted successfully.');
      }
    } catch (error) {
      console.error('Error deleting ref:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6 pt-4 pb-16 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">Admin Dashboard</h1>
        <p className="text-neutral-600 mt-1">
          {format(new Date(), 'EEEE, MMMM do, yyyy')}
        </p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="card bg-white px-4 py-5">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-accent/10 text-accent">
              <MapPin size={24} />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-neutral-500">Today's Visits</h2>
              <p className="text-2xl font-semibold text-neutral-900">{stats.today}</p>
            </div>
          </div>
        </div>
        
        <div className="card bg-white px-4 py-5">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-accent/10 text-accent">
              <Calendar size={24} />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-neutral-500">This Week</h2>
              <p className="text-2xl font-semibold text-neutral-900">{stats.thisWeek}</p>
            </div>
          </div>
        </div>
        
        <div className="card bg-white px-4 py-5">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-success/10 text-success">
              <BarChart2 size={24} />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-neutral-500">Completion Rate</h2>
              <p className="text-2xl font-semibold text-neutral-900">{completionRate}%</p>
            </div>
          </div>
        </div>
        
        <div className="card bg-white px-4 py-5">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-warning/10 text-warning">
              <User size={24} />
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-neutral-500">Refs</h2>
              <p className="text-2xl font-semibold text-neutral-900">{users.filter(u => u.role === 'Ref').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ref Records */}
      <div className="card bg-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Ref Records</h2>
        </div>
        {isLoading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent mx-auto"></div>
            <p className="mt-2 text-neutral-600">Loading refs...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-neutral-50 text-neutral-700">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {refs.map((ref) => (
                  <tr key={ref.id} className="border-b border-neutral-200 hover:bg-neutral-50">
                    <td className="px-4 py-3">{ref.first_name} {ref.last_name}</td>
                    <td className="px-4 py-3">{ref.email}</td>
                    <td className="px-4 py-3">{ref.role}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDeleteRef(ref.id)}
                        disabled={isDeleting === ref.id}
                        className="text-error hover:underline flex items-center"
                      >
                        {isDeleting === ref.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-error mr-2"></div>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 size={16} className="mr-1" />
                            Delete
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Filters and Actions */}
      <div className="card bg-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Visit Records</h2>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-secondary py-1 px-3 text-sm"
            >
              <Filter size={16} className="mr-1" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            
            <button
              onClick={exportCSV}
              className="btn btn-outline py-1 px-3 text-sm"
            >
              <Download size={16} className="mr-1" />
              Export CSV
            </button>
          </div>
        </div>
        
        {showFilters && (
          <div className="bg-neutral-50 p-4 rounded-md mb-4 border border-neutral-200 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Date Range
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                    className="input text-sm py-1"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                    className="input text-sm py-1"
                  />
                </div>
                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={setTodayRange}
                    className="text-xs bg-neutral-200 hover:bg-neutral-300 px-2 py-1 rounded"
                  >
                    Today
                  </button>
                  <button
                    onClick={setThisWeekRange}
                    className="text-xs bg-neutral-200 hover:bg-neutral-300 px-2 py-1 rounded"
                  >
                    This Week
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={resetFilters}
                className="text-accent hover:underline text-sm"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
        
        {isLoading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent mx-auto"></div>
            <p className="mt-2 text-neutral-600">Loading visits...</p>
          </div>
        ) : filteredVisits.length > 0 ? (
          <div>
            <p className="text-sm text-neutral-600 mb-3">
              Showing {filteredVisits.length} of {visits.length} total visits
            </p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-neutral-50 text-neutral-700">
                  <tr>
                    <th 
                      className="px-4 py-3 cursor-pointer"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center">
                        Date
                        {sortField === 'date' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp size={16} className="ml-1" /> : 
                            <ChevronDown size={16} className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 cursor-pointer"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Buyer
                        {sortField === 'name' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp size={16} className="ml-1" /> : 
                            <ChevronDown size={16} className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Reference</th>
                    <th 
                      className="px-4 py-3 cursor-pointer"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        {sortField === 'status' && (
                          sortDirection === 'asc' ? 
                            <ChevronUp size={16} className="ml-1" /> : 
                            <ChevronDown size={16} className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVisits.map((visit) => {
                    const refUser = users.find(u => u.id === visit.ref_id);
                    
                    return (
                      <tr key={visit.id} className="border-b border-neutral-200 hover:bg-neutral-50">
                        <td className="px-4 py-3">
                          {formatDateDisplay(visit.date)}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {visit.buyer_name}
                        </td>
                        <td className="px-4 py-3">
                          {visit.phone}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100">
                            {visit.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {refUser ? `${refUser.first_name} ${refUser.last_name}` : 'Unknown'}
                        </td>
                        <td className="px-4 py-3">
                          <span 
                            className={`flex items-center text-xs px-2 py-1 rounded-full ${
                              visit.status === 'Completed' 
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
                        </td>
                        <td className="px-4 py-3">
                          <a 
                            href={`https://www.google.com/maps/dir/?api=1&destination=${visit.location.lat},${visit.location.lng}`}
                            className="text-accent hover:underline flex items-center"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MapPin size={14} className="mr-1" /> Map
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-10">
            <Calendar size={48} className="mx-auto text-neutral-300 mb-3" />
            <p className="text-neutral-600 mb-2">No visits found matching your filters</p>
            <button
              onClick={resetFilters}
              className="btn btn-primary"
            >
              <RefreshCw size={16} className="mr-1" />
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
