import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    BarChart2, MapPin, Calendar, Filter, User, RefreshCw,
    ChevronDown, ChevronUp, Check, X, Trash2, Edit, Save
} from 'lucide-react';
import { Visit, User as UserType } from '../types';
import { supabase } from '../supabaseClient';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

// Define possible active filter states
type ActiveFilter = 'Today' | 'This Week' | 'All' | 'Custom';

const AdminDashboardPage: React.FC = () => {
    // ... (Keep all the state, effects, and handlers from the previous version) ...
    const { user } = useAuth();
    const [visits, setVisits] = useState<Visit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const [dateRange, setDateRange] = useState<{ start: string, end: string }>({ start: '', end: '' }); // Initialize empty
    const [sortField, setSortField] = useState<string>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [users, setUsers] = useState<UserType[]>([]);
    const [refs, setRefs] = useState<UserType[]>([]);
    const [isDeletingRef, setIsDeletingRef] = useState<string | null>(null);
    const deliveryTypes: Visit['type'][] = ['Sample', 'Sittu', 'Over']; // Define the types
    const [activeFilter, setActiveFilter] = useState<ActiveFilter>('Today'); // Add state for active filter button

    const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
    const [editedVisitData, setEditedVisitData] = useState<Partial<Visit> | null>(null);

    const todayDate = new Date();
    const thisWeekStart = startOfWeek(todayDate).toISOString().split('T')[0];
    const thisWeekEnd = endOfWeek(todayDate).toISOString().split('T')[0];
    const todayString = todayDate.toISOString().split('T')[0];

    useEffect(() => {
        // Set initial date range to today and active filter
        setDateRange({ start: todayString, end: todayString });
        setActiveFilter('Today');

        const fetchVisits = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from('visits')
                    .select('*')
                    .order('date', { ascending: false });

                if (error) throw error;
                setVisits(data || []);
                setSortField('date');
                setSortDirection('desc');

            } catch (error) {
                console.error('Error fetching visits:', error);
                alert('Failed to fetch visits.');
            }
        };

        const fetchUsers = async () => {
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*');

                if (error) throw error;

                setUsers(data || []);
                setRefs((data || []).filter(user => user.role === 'Ref'));
            } catch (error) {
                console.error('Error fetching users:', error);
                alert('Failed to fetch users.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchVisits();
        fetchUsers();
    }, []);

    const filteredVisits = visits.filter(visit => {
        // If 'All' is active, don't filter by date
        if (activeFilter === 'All') {
            return true;
        }
        // Otherwise, filter by date range
        const visitDate = visit.date.split('T')[0];
        // Ensure dateRange has valid dates before comparing
        if (!dateRange.start || !dateRange.end) return false;
        try {
            const start = parseISO(dateRange.start);
            const end = parseISO(dateRange.end);
            const current = parseISO(visitDate);
            // Use isWithinInterval for correct date range checking
            return isWithinInterval(current, { start, end });
        } catch (e) {
            console.warn("Error parsing dates for filtering:", dateRange, visitDate, e);
            return false; // Exclude if dates are invalid
        }
    }).sort((a, b) => {
        const fieldA = a[sortField as keyof Visit];
        const fieldB = b[sortField as keyof Visit];
        let comparison = 0;
        if (fieldA > fieldB) comparison = 1;
        else if (fieldA < fieldB) comparison = -1;
        return sortDirection === 'asc' ? comparison : comparison * -1;
    });

    const stats = {
        today: visits.filter(v => v.date.split('T')[0] === todayString).length,
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

    const handleSort = (field: keyof Visit) => {
        const newDirection = (sortField === field && sortDirection === 'asc') ? 'desc' : 'asc';
        setSortField(field);
        setSortDirection(newDirection);
    };

    const setThisWeekRange = () => {
        setDateRange({ start: thisWeekStart, end: thisWeekEnd });
        setActiveFilter('This Week');
    };
    const setTodayRange = () => {
        setDateRange({ start: todayString, end: todayString });
        setActiveFilter('Today');
    };

    // Handler for the 'All' button
    const handleShowAllClick = () => {
        setActiveFilter('All');
        // Optionally clear date range or keep it as is
        // setDateRange({ start: '', end: '' }); // Uncomment to clear dates when 'All' is clicked
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
        setDateRange(prev => ({ ...prev, [type]: e.target.value }));
        setActiveFilter('Custom'); // Set to custom when date inputs are changed
    };

    const resetFilters = () => {
        setActiveFilter('Today'); // Reset to Today
        setDateRange({ start: todayString, end: todayString });
        setSortField('date');
        setSortDirection('desc');
    };

    const formatDateDisplay = (dateString: string | null | undefined): string => {
        if (!dateString) return 'N/A';
        try {
            const datePart = dateString.split('T')[0];
            // Use a slightly shorter format for mobile if needed, but MMM d, yyyy is usually okay
            return format(parseISO(datePart), 'MMM d, yyyy');
        } catch (e) {
            console.warn("Failed to parse date:", dateString, e);
            return dateString;
        }
    };

    const handleDeleteRef = async (refId: string) => {
        if (!window.confirm('Are you sure you want to delete this Ref user? This action cannot be undone.')) return;
        setIsDeletingRef(refId);
        try {
            const { data: assignedVisits, error: checkError } = await supabase
                .from('visits')
                .select('id')
                .eq('ref_id', refId)
                .limit(1);
            if (checkError) throw checkError;
            if (assignedVisits && assignedVisits.length > 0) {
                alert('Cannot delete Ref. They are still assigned to one or more visits. Please reassign visits first.');
                setIsDeletingRef(null);
                return;
            }
            const { error: deleteError } = await supabase
                .from('users')
                .delete()
                .eq('id', refId);
            if (deleteError) throw deleteError;
            setRefs(prevRefs => prevRefs.filter(ref => ref.id !== refId));
            setUsers(prevUsers => prevUsers.filter(user => user.id !== refId));
            alert('Ref deleted successfully.');
        } catch (error: any) {
            console.error('Error deleting ref:', error);
            alert(`Failed to delete ref: ${error.message || 'Please try again.'}`);
        } finally {
            setIsDeletingRef(null);
        }
    };

    const handleEditClick = (visit: Visit) => {
        const visitDataToEdit = { ...visit };
        setEditingVisitId(visit.id);
        setEditedVisitData(visitDataToEdit);
    };

    const handleSaveVisit = async () => {
        if (!editingVisitId || !editedVisitData) return;
        const { id, location, ...updateData } = editedVisitData;
        if (!updateData.buyer_name?.trim()) return alert("Buyer name cannot be empty.");
        if (!updateData.phone?.trim()) return alert("Phone number cannot be empty.");
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('visits')
                .update(updateData as Partial<Visit>)
                .eq('id', editingVisitId)
                .select()
                .single();
            if (error) throw error;
            setVisits(prevVisits =>
                prevVisits.map(v => (v.id === editingVisitId ? data : v))
            );
            setEditingVisitId(null);
            setEditedVisitData(null);
        } catch (error: any) {
            console.error('Error updating visit:', error);
            alert(`Failed to update visit: ${error.message || 'Please try again.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteVisit = async (visitId: string) => {
        if (!window.confirm('Are you sure you want to delete this visit record?')) return;
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('visits')
                .delete()
                .eq('id', visitId);
            if (error) throw error;
            setVisits(prevVisits => prevVisits.filter(v => v.id !== visitId));
            if (editingVisitId === visitId) {
                setEditingVisitId(null);
                setEditedVisitData(null);
            }
            alert('Visit deleted successfully.');
        } catch (error: any) {
            console.error('Error deleting visit:', error);
            alert(`Failed to delete visit: ${error.message || 'Please try again.'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const renderVisitRow = (visit: Visit) => {
        const isEditing = editingVisitId === visit.id;
        const currentData = isEditing ? editedVisitData : visit;
        const refUser = users.find(u => u.id === visit.ref_id);

        return (
            <tr key={visit.id} className={`border-b border-neutral-200 ${isEditing ? 'bg-accent/5' : 'hover:bg-neutral-50'} text-sm`}>
                {/* Date */}
                <td className="px-2 py-2 sm:px-4 align-top whitespace-nowrap">
                    {formatDateDisplay(visit.date)}
                </td>
                {/* Buyer Name */}
                <td className="px-2 py-2 sm:px-4 align-top">
                    {isEditing ? (
                        <input
                            type="text"
                            value={currentData?.buyer_name || ''}
                            onChange={(e) => setEditedVisitData(prev => ({ ...prev, buyer_name: e.target.value }))}
                            className="input input-bordered input-xs sm:input-sm w-full"
                            placeholder="Buyer Name"
                        />
                    ) : (
                        <span className="font-medium">{visit.buyer_name}</span>
                    )}
                </td>
                {/* Phone */}
                <td className="px-2 py-2 sm:px-4 align-top hidden md:table-cell">
                    {isEditing ? (
                        <input
                            type="tel"
                            value={currentData?.phone || ''}
                            onChange={(e) => setEditedVisitData(prev => ({ ...prev, phone: e.target.value }))}
                            className="input input-bordered input-xs sm:input-sm w-full"
                            placeholder="Phone"
                        />
                    ) : (
                        visit.phone
                    )}
                </td>
                {/* Type */}
                <td className="px-2 py-2 sm:px-4 align-top hidden lg:table-cell">
                    {isEditing ? (
                        <select
                            value={currentData?.type || ''}
                            onChange={(e) => setEditedVisitData(prev => ({ ...prev, type: e.target.value }))}
                            className="select select-bordered select-xs sm:select-sm w-full"
                        >
                            <option value="" disabled>Type</option>
                            {deliveryTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    ) : (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap
                          ${visit.type === 'Sample' ? 'bg-sampleBlue text-white' : 
                            visit.type === 'Sittu' ? 'bg-sittuRose text-white' : 
                            visit.type === 'Over' ? 'bg-overGreen text-neutral-800' : 
                            'bg-neutral-100 text-neutral-700'}`}>
                            {visit.type}
                        </span>
                    )}
                </td>
                {/* Reference */}
                <td className="px-2 py-2 sm:px-4 align-top hidden lg:table-cell">
                    {isEditing ? (
                        <select
                            value={currentData?.ref_id || ''}
                            onChange={(e) => setEditedVisitData(prev => ({ ...prev, ref_id: e.target.value || null }))}
                            className="select select-bordered select-xs sm:select-sm w-full"
                        >
                            <option value="">None</option>
                            {refs.map(ref => (
                                <option key={ref.id} value={ref.id}>
                                    {ref.first_name} {ref.last_name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        refUser ? `${refUser.first_name} ${refUser.last_name}` : <span className="text-neutral-500">None</span>
                    )}
                </td>
                {/* Status */}
                <td className="px-2 py-2 sm:px-4 align-top">
                    {isEditing ? (
                        <select
                            value={currentData?.status || ''}
                            onChange={(e) => setEditedVisitData(prev => ({ ...prev, status: e.target.value }))}
                            className="select select-bordered select-xs sm:select-sm w-full"
                        >
                            <option value="" disabled>Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    ) : (
                        <span
                            className={`inline-flex items-center text-xs px-2 py-1 rounded-full whitespace-nowrap ${visit.status === 'Completed' ? 'bg-success/10 text-success' : visit.status === 'Pending' ? 'bg-warning/10 text-warning' : visit.status === 'Cancelled' ? 'bg-error/10 text-error' : 'bg-neutral-100 text-neutral-600'}`}
                        >
                            {visit.status === 'Completed' && <Check size={12} className="mr-1 flex-shrink-0" />}
                            {visit.status === 'Cancelled' && <X size={12} className="mr-1 flex-shrink-0" />}
                            {visit.status || 'N/A'}
                        </span>
                    )}
                </td>
                {/* Actions */}
                <td className="px-2 py-2 sm:px-4 align-top">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-1 space-y-1 sm:space-y-0">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={handleSaveVisit}
                                    disabled={isLoading}
                                    className="btn btn-xs btn-success btn-outline flex items-center justify-center sm:justify-start"
                                    title="Save Changes"
                                >
                                    <Save size={14} className="mr-0 sm:mr-1" />
                                    <span className="hidden sm:inline">Save</span>
                                </button>
                                <button
                                    onClick={() => setEditingVisitId(null)}
                                    disabled={isLoading}
                                    className="btn btn-xs btn-ghost flex items-center justify-center sm:justify-start"
                                    title="Cancel Editing"
                                >
                                    <X size={14} className="mr-0 sm:mr-1" />
                                    <span className="hidden sm:inline">Cancel</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => handleEditClick(visit)}
                                    disabled={editingVisitId !== null}
                                    className="btn btn-xs btn-ghost text-accent hover:bg-accent/10 flex items-center justify-center sm:justify-start"
                                    title="Edit Visit"
                                >
                                    <Edit size={14} className="mr-0 sm:mr-1" />
                                    <span className="hidden sm:inline">Edit</span>
                                </button>
                                <button
                                    onClick={() => handleDeleteVisit(visit.id)}
                                    disabled={isLoading || editingVisitId !== null}
                                    className="btn btn-xs btn-ghost text-error hover:bg-error/10 flex items-center justify-center sm:justify-start"
                                    title="Delete Visit"
                                >
                                    <Trash2 size={14} className="mr-0 sm:mr-1" />
                                    <span className="hidden sm:inline">Delete</span>
                                </button>
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${visit.location?.lat},${visit.location?.lng}`}
                                    className={`btn btn-xs btn-ghost text-info hover:bg-info/10 flex items-center justify-center sm:justify-start ${!visit.location?.lat ? 'disabled opacity-50 pointer-events-none' : ''}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open in Google Maps"
                                >
                                    <MapPin size={14} className="mr-0 sm:mr-1" />
                                    <span className="hidden sm:inline">Map</span>
                                </a>
                            </>
                        )}
                    </div>
                </td>
            </tr>
        );
    };


    // --- JSX Structure ---
    return (
        // Add padding to the main container for mobile screen edges
        <div className="space-y-4 sm:space-y-6 pt-2 pb-10 sm:pt-4 sm:pb-16 animate-fade-in px-2 sm:px-0">
            {/* Keep header padding consistent, Add bottom margin */}
            <header className="px-2 sm:px-0 mb-4 sm:mb-6"> {/* Increased bottom margin */}
                <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">Admin Dashboard</h1>
                <p className="text-sm sm:text-base text-neutral-600 mt-1">
                    {format(new Date(), 'EEEE, MMM do, yyyy')}
                </p>
            </header>

            {/* Stats Cards: Change grid columns for responsiveness */}
            {/* Stack vertically on mobile (col-1), 2 cols on sm+, 4 cols on md+ */}
            {/* Keep padding inside stats cards container consistent */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 px-0"> {/* Start with 1 col, adjust gap */}
                {/* Today's Visits Card */}
                {/* Adjusted padding inside card */}
                <div className="card bg-white p-4 shadow-sm border border-neutral-200">
                    <div className="flex items-center">
                         {/* Consistent icon padding/size */}
                        <div className="p-3 rounded-full bg-info/10 text-info">
                            <MapPin size={20} />
                        </div>
                        <div className="ml-3 sm:ml-4"> {/* Consistent margin */}
                            <h2 className="text-sm font-medium text-neutral-500">Today</h2>
                            <p className="text-xl sm:text-2xl font-semibold text-neutral-900">{stats.today}</p>
                        </div>
                    </div>
                </div>
                {/* This Week Card */}
                <div className="card bg-white p-4 shadow-sm border border-neutral-200">
                     <div className="flex items-center">
                        <div className="p-3 rounded-full bg-accent/10 text-accent">
                            <Calendar size={20} />
                        </div>
                        <div className="ml-3 sm:ml-4">
                            <h2 className="text-sm font-medium text-neutral-500">This Week</h2>
                            <p className="text-xl sm:text-2xl font-semibold text-neutral-900">{stats.thisWeek}</p>
                        </div>
                    </div>
                </div>
                {/* Completion Rate Card */}
                <div className="card bg-white p-4 shadow-sm border border-neutral-200">
                     <div className="flex items-center">
                        <div className="p-3 rounded-full bg-success/10 text-success">
                            <BarChart2 size={20} />
                        </div>
                        <div className="ml-3 sm:ml-4">
                            <h2 className="text-sm font-medium text-neutral-500">Complete</h2>
                            <p className="text-xl sm:text-2xl font-semibold text-neutral-900">{completionRate}%</p>
                        </div>
                    </div>
                </div>
                {/* Refs Card */}
                <div className="card bg-white p-4 shadow-sm border border-neutral-200">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-warning/10 text-warning">
                            <User size={20} />
                        </div>
                        <div className="ml-3 sm:ml-4">
                            <h2 className="text-sm font-medium text-neutral-500">Refs</h2>
                            <p className="text-xl sm:text-2xl font-semibold text-neutral-900">{refs.length}</p>
                        </div>
                    </div>
                </div>
            </div>

             {/* Ref Records Card */}
             {/* Remove horizontal margin as main container now has padding */}
             <div className="card bg-white p-3 sm:p-5 shadow-sm border border-neutral-200">
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                    <h2 className="text-base sm:text-lg font-semibold text-neutral-800">Ref Management</h2>
                </div>
                {isLoading && !refs.length ? (
                    <div className="text-center py-6 sm:py-10">
                        <span className="loading loading-spinner loading-md sm:loading-lg text-accent"></span>
                        <p className="mt-2 text-sm sm:text-base text-neutral-600">Loading refs...</p>
                    </div>
                ) : !refs.length ? (
                    <p className="text-neutral-600 text-center py-3 sm:py-5 text-sm sm:text-base">No Ref users found.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table table-xs sm:table-sm w-full text-sm">
                            <thead className="bg-neutral-50 text-neutral-700 text-xs sm:text-sm">
                                <tr>
                                    <th className="px-2 py-2 sm:px-4 sm:py-3">Name</th>
                                    <th className="px-2 py-2 sm:px-4 sm:py-3 hidden sm:table-cell">Email</th>
                                    <th className="px-2 py-2 sm:px-4 sm:py-3">Role</th>
                                    <th className="px-2 py-2 sm:px-4 sm:py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {refs.map((ref) => (
                                    <tr key={ref.id} className="border-b border-neutral-200 hover:bg-neutral-50">
                                        <td className="px-2 py-2 sm:px-4 whitespace-nowrap">{ref.first_name} {ref.last_name}</td>
                                        <td className="px-2 py-2 sm:px-4 hidden sm:table-cell">{ref.email}</td>
                                        <td className="px-2 py-2 sm:px-4">
                                            <span className="badge badge-warning badge-outline text-xs">{ref.role}</span>
                                        </td>
                                        <td className="px-2 py-2 sm:px-4">
                                            <button
                                                onClick={() => handleDeleteRef(ref.id)}
                                                disabled={isDeletingRef === ref.id || isLoading}
                                                className="btn btn-xs btn-ghost text-error hover:bg-error/10 flex items-center"
                                                title={`Delete Ref ${ref.first_name}`}
                                            >
                                                {isDeletingRef === ref.id ? (
                                                    <>
                                                        <span className="loading loading-spinner loading-xs mr-1 sm:mr-2"></span>
                                                        <span className="hidden sm:inline">Deleting...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Trash2 size={14} className="mr-0 sm:mr-1" />
                                                        <span className="hidden sm:inline">Delete</span>
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

            {/* Visit Records Card */}
            {/* Remove horizontal margin */}
            <div className="card bg-white p-3 sm:p-5 shadow-sm border border-neutral-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                    <h2 className="text-base sm:text-lg font-semibold text-neutral-800">Visit Records</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="btn btn-xs sm:btn-sm btn-outline btn-secondary"
                        >
                            <Filter size={14} className="mr-1" />
                            Filter
                            <span className="hidden sm:inline ml-1">{showFilters ? '/ Hide' : '/ Show'}</span>
                        </button>
                    </div>
                </div>

                {/* --- Filters --- */}
                {showFilters && (
                    <div className="bg-neutral-50 p-3 sm:p-4 rounded-md mb-4 border border-neutral-200 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 items-end">
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-neutral-700 mb-1">
                                    Date Range
                                </label>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                    <input
                                        type="date"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                        className="input input-bordered input-sm w-full"
                                    />
                                    <span className="text-neutral-500 text-center sm:text-left">to</span>
                                    <input
                                        type="date"
                                        value={dateRange.end}
                                        min={dateRange.start}
                                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                        className="input input-bordered input-sm w-full"
                                    />
                                </div>
                                <div className="flex space-x-2 mt-2">
                                    <button onClick={setTodayRange} className={`btn btn-sm btn-outline ${activeFilter === 'Today' ? 'btn-active btn-accent' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'}`}>Today</button>
                                    <button onClick={setThisWeekRange} className={`btn btn-sm btn-outline ${activeFilter === 'This Week' ? 'btn-active btn-accent' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'}`}>This Week</button>
                                    {/* Add the 'All' button */}
                                    <button onClick={handleShowAllClick} className={`btn btn-sm btn-outline ${activeFilter === 'All' ? 'btn-active btn-accent' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'}`}>All</button>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end mt-2">
                            <button
                                onClick={resetFilters}
                                className="btn btn-xs sm:btn-sm btn-ghost text-accent"
                            >
                                <RefreshCw size={14} className="mr-1" /> Reset
                            </button>
                        </div>
                    </div>
                )}

                {/* --- Visits Table --- */}
                {isLoading ? (
                   <div className="text-center py-6 sm:py-10">
                        <span className="loading loading-spinner loading-md sm:loading-lg text-accent"></span>
                        <p className="mt-2 text-sm sm:text-base text-neutral-600">Loading visits...</p>
                    </div>
                ) : filteredVisits.length > 0 ? (
                    <div>
                        <p className="text-xs sm:text-sm text-neutral-600 mb-2 sm:mb-3">
                            Showing {filteredVisits.length} visit{filteredVisits.length !== 1 ? 's' : ''}
                            {visits.length !== filteredVisits.length ? ` (filtered from ${visits.length})` : ''}
                        </p>
                        <div className="overflow-x-auto border border-neutral-200 rounded-md">
                            <table className="table table-xs sm:table-sm w-full">
                                <thead className="bg-neutral-50 text-neutral-700 text-xs sm:text-sm">
                                    <tr>
                                        <th className="px-2 py-2 sm:px-4 sm:py-3 cursor-pointer hover:bg-neutral-100 whitespace-nowrap" onClick={() => handleSort('date')}>
                                            <div className="flex items-center">Date {sortField === 'date' && (sortDirection === 'asc' ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />)}</div>
                                        </th>
                                        <th className="px-2 py-2 sm:px-4 sm:py-3 cursor-pointer hover:bg-neutral-100" onClick={() => handleSort('buyer_name')}>
                                            <div className="flex items-center">Buyer {sortField === 'buyer_name' && (sortDirection === 'asc' ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />)}</div>
                                        </th>
                                        <th className="px-2 py-2 sm:px-4 sm:py-3 hidden md:table-cell">Phone</th>
                                        <th className="px-2 py-2 sm:px-4 sm:py-3 hidden lg:table-cell">Type</th>
                                        <th className="px-2 py-2 sm:px-4 sm:py-3 hidden lg:table-cell">Reference</th>
                                        <th className="px-2 py-2 sm:px-4 sm:py-3 cursor-pointer hover:bg-neutral-100" onClick={() => handleSort('status')}>
                                            <div className="flex items-center">Status {sortField === 'status' && (sortDirection === 'asc' ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />)}</div>
                                        </th>
                                        <th className="px-2 py-2 sm:px-4 sm:py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVisits.map(visit => renderVisitRow(visit))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6 sm:py-10 border border-dashed border-neutral-300 rounded-md">
                        <Calendar size={40} className="mx-auto text-neutral-400 mb-3" />
                        <p className="text-neutral-600 mb-3 sm:mb-4 text-sm sm:text-base">
                            No visits found matching your current filters.
                        </p>
                        <button
                            onClick={resetFilters}
                            className="btn btn-xs sm:btn-sm btn-primary"
                        >
                            <RefreshCw size={14} className="mr-1" />
                            Reset Filters
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboardPage;
