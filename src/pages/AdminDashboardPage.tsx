import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BarChart2, MapPin, Calendar, Filter, Download, User, RefreshCw, ChevronDown, ChevronUp, Check, X, Trash2 } from 'lucide-react';
import { Visit, User as UserType } from '../types'; // Assuming UserType is defined in types
import { supabase } from '../supabaseClient';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth(); // Assuming useAuth provides the logged-in user context if needed later
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
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc'); // Default to descending date
  const [users, setUsers] = useState<UserType[]>([]);
  const [refs, setRefs] = useState<UserType[]>([]);
  const [isDeletingRef, setIsDeletingRef] = useState<string | null>(null); // State for deleting refs

  // This week range for stats and quick filter
  const thisWeekStart = startOfWeek(new Date()).toISOString().split('T')[0];
  const thisWeekEnd = endOfWeek(new Date()).toISOString().split('T')[0];

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch users first to populate refs dropdown
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*');

        if (usersError) throw usersError;

        const allUsers = usersData || [];
        setUsers(allUsers);
        setRefs(allUsers.filter(u => u.role === 'Ref'));

        // Fetch visits
        const { data: visitsData, error: visitsError } = await supabase
          .from('visits')
          .select('*')
          // Default sort order matching initial state
          .order(sortField, { ascending: sortDirection === 'asc' });

        if (visitsError) throw visitsError;

        setVisits(visitsData || []);

      } catch (error) {
        console.error('Error fetching data:', error);
        // Consider adding user-facing error feedback here
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []); // Initial fetch on mount

  // --- Visit Update Handlers (from first snippet) ---

  const handleRefChange = async (visitId: string, newRefId: string) => {
    try {
      const updateData = newRefId === "" ? { ref_id: null } : { ref_id: newRefId };
      const { error } = await supabase
        .from('visits')
        .update(updateData)
        .eq('id', visitId);

      if (error) throw error;

      setVisits(visits.map(visit =>
        visit.id === visitId ? { ...visit, ...updateData } : visit
      ));
    } catch (error) {
      console.error('Error updating reference:', error);
      alert('Failed to update reference.');
    }
  };

  const handleTypeChange = async (visitId: string, newType: 'Delivery' | 'Collection') => {
    try {
      const { error } = await supabase
        .from('visits')
        .update({ type: newType })
        .eq('id', visitId);

      if (error) throw error;

      setVisits(visits.map(visit =>
        visit.id === visitId ? { ...visit, type: newType } : visit
      ));
    } catch (error) {
      console.error('Error updating type:', error);
      alert('Failed to update type.');
    }
  };

  const handleStatusChange = async (visitId: string, newStatus: 'Pending' | 'Completed' | 'Cancelled') => {
    try {
      const { error } = await supabase
        .from('visits')
        .update({ status: newStatus })
        .eq('id', visitId);

      if (error) throw error;

      setVisits(visits.map(visit =>
        visit.id === visitId ? { ...visit, status: newStatus } : visit
      ));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status.');
    }
  };

  const handleBuyerChange = async (visitId: string, newName: string) => {
    // Basic debounce or save-on-blur might be good here in a real app
    try {
      const { error } = await supabase
        .from('visits')
        .update({ buyer_name: newName })
        .eq('id', visitId);

      if (error) throw error;

      setVisits(visits.map(visit =>
        visit.id === visitId ? { ...visit, buyer_name: newName } : visit
      ));
    } catch (error) {
      console.error('Error updating buyer name:', error);
      alert('Failed to update buyer name.');
    }
  };

  const handlePhoneChange = async (visitId: string, newPhone: string) => {
    // Basic debounce or save-on-blur might be good here
    try {
      const { error } = await supabase
        .from('visits')
        .update({ phone: newPhone })
        .eq('id', visitId);

      if (error) throw error;

      setVisits(visits.map(visit =>
        visit.id === visitId ? { ...visit, phone: newPhone } : visit
      ));
    } catch (error) {
      console.error('Error updating phone:', error);
      alert('Failed to update phone.');
    }
  };

  // --- Visit Deletion Handler (from first snippet) ---

  const handleDeleteVisit = async (visitId: string) => {
    if (!window.confirm('Are you sure you want to delete this visit? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', visitId);

      if (error) throw error;

      setVisits(visits.filter(v => v.id !== visitId));
      alert('Visit deleted successfully.');
    } catch (error) {
      console.error('Error deleting visit:', error);
      alert('Failed to delete visit.');
    }
  };

  // --- Ref Deletion Handler (from second snippet) ---

  const handleDeleteRef = async (refId: string) => {
     if (!window.confirm('Are you sure you want to delete this ref? This might affect associated visits.')) return;
    setIsDeletingRef(refId);
    try {
      // Optional: First, update visits associated with this ref to have ref_id = null
      // const { error: updateError } = await supabase
      //   .from('visits')
      //   .update({ ref_id: null })
      //   .eq('ref_id', refId);
      // if (updateError) throw updateError;

      // Then delete the user
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', refId);

      if (error) {
        console.error('Error deleting ref:', error);
        alert('Failed to delete ref. Please check console for details.');
      } else {
        setRefs(refs.filter(ref => ref.id !== refId));
        setUsers(users.filter(u => u.id !== refId)); // Also remove from general users list
        // Optionally update visits state if you nulled ref_id above
        // setVisits(visits.map(v => v.ref_id === refId ? { ...v, ref_id: null } : v));
        alert('Ref deleted successfully.');
      }
    } catch (error) {
      console.error('Error deleting ref:', error);
      alert('An unexpected error occurred while deleting the ref.');
    } finally {
      setIsDeletingRef(null);
    }
  };


  // --- Filtering and Sorting Logic (from second snippet) ---

  const filteredVisits = visits.filter(visit => {
    const visitDate = visit.date.split('T')[0]; // Compare only date part
    const isInDateRange = !dateRange.start || !dateRange.end || (visitDate >= dateRange.start && visitDate <= dateRange.end);
    const matchesStatus = statusFilter === 'all' || visit.status === statusFilter;
    const matchesType = typeFilter === 'all' || visit.type === typeFilter;
    // Check ref_id (which can be null)
    const matchesRef = refFilter === 'all' || (visit.ref_id === refFilter) || (refFilter === "none" && visit.ref_id === null);

    return isInDateRange && matchesStatus && matchesType && matchesRef;
  }).sort((a, b) => {
    const fieldA = a[sortField as keyof Visit];
    const fieldB = b[sortField as keyof Visit];

    let comparison = 0;
    if (fieldA === null || fieldA === undefined) comparison = -1; // Handle nulls
    if (fieldB === null || fieldB === undefined) comparison = 1; // Handle nulls

    if (comparison === 0) {
        if (typeof fieldA === 'string' && typeof fieldB === 'string') {
            comparison = fieldA.localeCompare(fieldB);
        } else if (typeof fieldA === 'number' && typeof fieldB === 'number') {
            comparison = fieldA - fieldB;
        }
        // Add more type checks if needed (e.g., for dates if not stored as strings)
    }

    return sortDirection === 'asc' ? comparison : comparison * -1;
  });

  // --- Statistics Calculation (from second snippet) ---

  const stats = {
    today: visits.filter(v => v.date.split('T')[0] === new Date().toISOString().split('T')[0]).length,
    thisWeek: visits.filter(v => {
      const visitDate = v.date.split('T')[0];
      return visitDate >= thisWeekStart && visitDate <= thisWeekEnd;
    }).length,
    completedThisWeek: visits.filter(v => { // More specific stat
        const visitDate = v.date.split('T')[0];
        return v.status === 'Completed' && visitDate >= thisWeekStart && visitDate <= thisWeekEnd;
    }).length,
    pending: visits.filter(v => v.status === 'Pending').length,
    total: visits.length,
  };

  const completionRateThisWeek = stats.thisWeek > 0
    ? Math.round((stats.completedThisWeek / stats.thisWeek) * 100)
    : 0;


  // --- UI Handlers (from second snippet) ---

  const handleSort = (field: keyof Visit) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    // Note: Sorting is now handled by the .sort() on filteredVisits directly
  };

  const exportCSV = () => {
    if (filteredVisits.length === 0) {
        alert('No visits to export.');
        return;
    }
    // Basic CSV Generation
    const headers = ['Date', 'Buyer Name', 'Phone', 'Type', 'Reference Name', 'Status', 'Latitude', 'Longitude'];
    const rows = filteredVisits.map(visit => {
        const refUser = users.find(u => u.id === visit.ref_id);
        const refName = refUser ? `${refUser.first_name} ${refUser.last_name}` : 'N/A';
        return [
            formatDateDisplay(visit.date),
            `"${visit.buyer_name.replace(/"/g, '""')}"`, // Handle quotes in names
            visit.phone,
            visit.type,
            `"${refName.replace(/"/g, '""')}"`,
            visit.status,
            visit.location.lat,
            visit.location.lng
        ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `visits_export_${dateRange.start}_to_${dateRange.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert('Exporting visits as CSV...'); // Keep alert for feedback
  };

  const setThisWeekRange = () => {
    setDateRange({
      start: thisWeekStart,
      end: thisWeekEnd,
    });
  };

  const setTodayRange = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateRange({
      start: today,
      end: today,
    });
  };

  const resetFilters = () => {
    // Reset to default range (e.g., today or leave empty for all time depending on preference)
     const today = new Date().toISOString().split('T')[0];
     setDateRange({ start: today, end: today });
    // setDateRange({ start: '', end: '' }); // Or reset to show all dates initially
    setStatusFilter('all');
    setTypeFilter('all');
    setRefFilter('all');
    // Optionally reset sort?
    // setSortField('date');
    // setSortDirection('desc');
  };

  // Format date for display
  const formatDateDisplay = (dateString: string) => {
    try {
      // Handle potential timezone issues if dates are stored in UTC but should be local
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString; // Fallback
    }
  };

  // --- Render JSX ---
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
        {/* Card: Today's Visits */}
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
        {/* Card: This Week Visits */}
        <div className="card bg-white px-4 py-5">
            <div className="flex items-center">
                <div className="p-3 rounded-full bg-accent/10 text-accent">
                    <Calendar size={24} />
                </div>
                <div className="ml-4">
                    <h2 className="text-sm font-medium text-neutral-500">Visits This Week</h2>
                    <p className="text-2xl font-semibold text-neutral-900">{stats.thisWeek}</p>
                </div>
            </div>
        </div>
        {/* Card: Completion Rate This Week */}
        <div className="card bg-white px-4 py-5">
            <div className="flex items-center">
                <div className="p-3 rounded-full bg-success/10 text-success">
                    <BarChart2 size={24} />
                </div>
                <div className="ml-4">
                    <h2 className="text-sm font-medium text-neutral-500">Completion (Week)</h2>
                    <p className="text-2xl font-semibold text-neutral-900">{completionRateThisWeek}%</p>
                </div>
            </div>
        </div>
        {/* Card: Refs */}
        <div className="card bg-white px-4 py-5">
            <div className="flex items-center">
                <div className="p-3 rounded-full bg-warning/10 text-warning">
                    <User size={24} />
                </div>
                <div className="ml-4">
                    <h2 className="text-sm font-medium text-neutral-500">Active Refs</h2>
                    <p className="text-2xl font-semibold text-neutral-900">{refs.length}</p>
                </div>
            </div>
        </div>
      </div>

      {/* Ref Records Table */}
      <div className="card bg-white">
        <div className="flex justify-between items-center mb-4 px-4 pt-4">
          <h2 className="text-lg font-semibold">Ref Records</h2>
          {/* Add Button for creating new refs could go here */}
        </div>
        {isLoading ? (
          <div className="text-center py-10"><p>Loading refs...</p></div>
        ) : refs.length === 0 ? (
          <p className="text-center py-5 text-neutral-500 px-4">No Refs found.</p>
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
                        disabled={isDeletingRef === ref.id}
                        className={`text-error hover:text-red-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isDeletingRef === ref.id ? (
                          <>
                            <RefreshCw size={16} className="mr-1 animate-spin" />
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

      {/* Visits Section: Filters and Table */}
      <div className="card bg-white">
         <div className="flex flex-wrap justify-between items-center mb-4 px-4 pt-4 gap-2">
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

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-neutral-50 p-4 rounded-md mb-4 border border-neutral-200 animate-fade-in mx-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Date Range
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                    className="input text-sm py-1 px-2 w-full"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                    className="input text-sm py-1 px-2 w-full"
                     min={dateRange.start} // Prevent end date being before start date
                  />
                </div>
                <div className="flex space-x-2 mt-2">
                  <button onClick={setTodayRange} className="text-xs bg-neutral-200 hover:bg-neutral-300 px-2 py-1 rounded">Today</button>
                  <button onClick={setThisWeekRange} className="text-xs bg-neutral-200 hover:bg-neutral-300 px-2 py-1 rounded">This Week</button>
                </div>
              </div>
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
                 <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input text-sm py-1.5 px-2 w-full">
                     <option value="all">All Statuses</option>
                     <option value="Pending">Pending</option>
                     <option value="Completed">Completed</option>
                     <option value="Cancelled">Cancelled</option>
                 </select>
              </div>
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Type</label>
                 <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input text-sm py-1.5 px-2 w-full">
                     <option value="all">All Types</option>
                     <option value="Delivery">Delivery</option>
                     <option value="Collection">Collection</option>
                 </select>
              </div>
               {/* Ref Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Reference</label>
                 <select value={refFilter} onChange={e => setRefFilter(e.target.value)} className="input text-sm py-1.5 px-2 w-full">
                     <option value="all">All Refs</option>
                     <option value="none">No Ref Assigned</option>
                     {refs.map(ref => (
                         <option key={ref.id} value={ref.id}>{ref.first_name} {ref.last_name}</option>
                     ))}
                 </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={resetFilters} className="text-accent hover:underline text-sm">
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* Visits Table */}
        {isLoading ? (
          <div className="text-center py-10">
            <RefreshCw size={32} className="mx-auto text-neutral-400 animate-spin mb-3" />
            <p className="text-neutral-600">Loading visits...</p>
          </div>
        ) : filteredVisits.length > 0 ? (
          <div>
            <p className="text-sm text-neutral-600 mb-3 px-4">
              Showing {filteredVisits.length} visit{filteredVisits.length !== 1 ? 's' : ''}{visits.length !== filteredVisits.length ? ` (filtered from ${visits.length})` : ''}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[800px]"> {/* Min width for better horizontal scroll */}
                <thead className="bg-neutral-50 text-neutral-700">
                  <tr>
                    <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('date')}>
                      <div className="flex items-center"> Date
                        {sortField === 'date' && (sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />)}
                      </div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('buyer_name')}>
                      <div className="flex items-center"> Buyer
                         {/* Ensure sort field matches the key used in data */}
                        {sortField === 'buyer_name' && (sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />)}
                      </div>
                    </th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('type')}>
                      <div className="flex items-center"> Type
                        {sortField === 'type' && (sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />)}
                      </div>
                    </th>
                     <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('ref_id')}>
                      <div className="flex items-center"> Reference
                        {sortField === 'ref_id' && (sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />)}
                      </div>
                    </th>
                    <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('status')}>
                      <div className="flex items-center"> Status
                        {sortField === 'status' && (sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />)}
                      </div>
                    </th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                {/* Table Body with INLINE EDITING */}
                <tbody>
                  {filteredVisits.map((visit) => (
                    <tr key={visit.id} className="border-b border-neutral-200 hover:bg-neutral-50 align-top"> {/* Use align-top for consistency */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDateDisplay(visit.date)}
                      </td>
                       {/* Editable Buyer cell */}
                       <td className="px-4 py-2"> {/* Reduced padding for inputs */}
                         <input
                           type="text"
                           defaultValue={visit.buyer_name} // Use defaultValue for uncontrolled or value for controlled
                           // Consider adding onBlur or debounce for saving
                           onChange={(e) => handleBuyerChange(visit.id, e.target.value)}
                           className="input text-sm py-1 px-2 w-full max-w-[150px]" // Max width helps layout
                         />
                       </td>
                       {/* Editable Phone cell */}
                       <td className="px-4 py-2">
                         <input
                           type="text"
                           defaultValue={visit.phone}
                           onChange={(e) => handlePhoneChange(visit.id, e.target.value)}
                           className="input text-sm py-1 px-2 w-full max-w-[130px]"
                         />
                       </td>
                       {/* Editable Type cell */}
                       <td className="px-4 py-2">
                         <select
                           value={visit.type} // Controlled component
                           onChange={(e) => handleTypeChange(visit.id, e.target.value as 'Delivery' | 'Collection')}
                           className="input text-sm py-1.5 px-2 w-full max-w-[120px]"
                         >
                           <option value="Delivery">Delivery</option>
                           <option value="Collection">Collection</option>
                         </select>
                       </td>
                       {/* Editable Reference cell */}
                       <td className="px-4 py-2">
                         <select
                           value={visit.ref_id || ''} // Controlled component, handle null ref_id
                           onChange={(e) => handleRefChange(visit.id, e.target.value)}
                           className="input text-sm py-1.5 px-2 w-full max-w-[150px]"
                         >
                           <option value="">No Ref</option>
                           {refs.map(ref => (
                             <option key={ref.id} value={ref.id}>
                               {ref.first_name} {ref.last_name}
                             </option>
                           ))}
                         </select>
                       </td>
                       {/* Editable Status cell */}
                       <td className="px-4 py-2">
                         <select
                           value={visit.status} // Controlled component
                           onChange={(e) => handleStatusChange(visit.id, e.target.value as 'Pending' | 'Completed' | 'Cancelled')}
                           className="input text-sm py-1.5 px-2 w-full max-w-[120px]"
                         >
                           <option value="Pending">Pending</option>
                           <option value="Completed">Completed</option>
                           <option value="Cancelled">Cancelled</option>
                         </select>
                       </td>
                       {/* Action cell with Map and Delete */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                            <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${visit.location.lat},${visit.location.lng}`}
                                className="text-accent hover:underline flex items-center"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open in Google Maps"
                            >
                                <MapPin size={16} className="mr-1" /> Map
                            </a>
                            <button
                                onClick={() => handleDeleteVisit(visit.id)}
                                className="text-error hover:text-red-700 flex items-center"
                                title="Delete Visit"
                            >
                                <Trash2 size={16} className="mr-1" /> Delete
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // No Visits Found Message
          <div className="text-center py-10">
            <Calendar size={48} className="mx-auto text-neutral-300 mb-3" />
            <p className="text-neutral-600 mb-2">No visits found matching your current filters.</p>
            <button onClick={resetFilters} className="btn btn-primary">
              <RefreshCw size={16} className="mr-1" />
              Reset Filters
            </button>
          </div>
        )}
      </div> {/* End Visits Card */}
    </div> // End Page Container
  );
};

export default AdminDashboardPage;

// Make sure you have the following types defined in '../types' or similar
/*
export interface Visit {
  id: string;
  date: string; // ISO string format e.g., "2023-10-27T10:00:00Z"
  buyer_name: string;
  phone: string;
  type: 'Delivery' | 'Collection';
  ref_id: string | null; // Foreign key to users table
  status: 'Pending' | 'Completed' | 'Cancelled';
  location: { lat: number; lng: number }; // Or however location is stored
  created_at: string;
  // Add any other relevant fields from your 'visits' table
}

export interface User {
  id: string; // Typically UUID from Supabase Auth
  email: string;
  first_name: string;
  last_name: string;
  role: string; // e.g., 'Admin', 'Ref', 'User'
  // Add any other relevant fields from your 'users' table
}
*/

// Make sure you have CSS classes like 'card', 'btn', 'input', etc defined
// (e.g., using Tailwind CSS utility classes or custom CSS)
// Example Tailwind setup might include:
// card: 'bg-white shadow rounded-lg p-4'
// btn: 'inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent'
// btn-secondary: 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300'
// btn-outline: 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
// input: 'block w-full border-neutral-300 rounded-md shadow-sm focus:ring-accent focus:border-accent sm:text-sm'
// text-accent: 'text-blue-600'
// text-success: 'text-green-600'
// text-warning: 'text-yellow-600'
// text-error: 'text-red-600'
// bg-accent/10: 'bg-blue-100' (approximate)
// etc.