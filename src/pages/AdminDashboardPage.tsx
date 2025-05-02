import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    BarChart2, MapPin, Calendar, User, RefreshCw, ChevronDown, ChevronUp,
    Check, X, Trash2, Edit, Save, Phone, Home, Edit3, Tag, Users, Clock, Eye, EyeOff, Search, ListFilter,
    ArrowUp, ArrowDown
} from 'lucide-react';
import { Visit, User as UserType } from '../types';
import { supabase } from '../supabaseClient';
import {
    format, parseISO, startOfWeek, endOfWeek, isWithinInterval, formatDistanceToNow,
    startOfMonth, endOfMonth, subMonths
} from 'date-fns';

// --- (Keep unchanged code: Active Filters, HighlightMatch) ---
type ActiveVisitDateFilter = 'Today' | 'This Week' | 'All' | 'Custom';
type ActiveRefDateFilter = 'All' | 'This Month' | 'Last Month' | 'Custom';

const HighlightMatch: React.FC<{ text: string | null | undefined; highlight: string | null | undefined }> = ({ text, highlight }) => {
    if (!highlight || !text) { return <>{text || ''}</>; }
    const lowerText = text.toLowerCase();
    const lowerHighlight = highlight.toLowerCase();
    const index = lowerText.indexOf(lowerHighlight);
    if (index === -1) { return <>{text}</>; }
    const before = text.substring(0, index);
    const match = text.substring(index, index + highlight.length);
    const after = text.substring(index + highlight.length);
    return ( <>{before}<mark className="bg-yellow-200 px-0.5 rounded-sm font-semibold text-neutral-800">{match}</mark>{after}</> );
};


const AdminDashboardPage: React.FC = () => {
    const { user } = useAuth();
    // --- (Keep unchanged code: State Variables, Constants, Filters, Sort) ---
    const [visits, setVisits] = useState<Visit[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);
    const [allRefs, setAllRefs] = useState<UserType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDataReady, setIsDataReady] = useState(false);
    const [isDeletingRef, setIsDeletingRef] = useState<string | null>(null);
    const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
    const [editedVisitData, setEditedVisitData] = useState<Partial<Visit & { item_id_string?: string }>>({});
    const [showVisitFilters, setShowVisitFilters] = useState(false);
    const [showRefFilters, setShowRefFilters] = useState(false);
    const [isRefSectionCollapsed, setIsRefSectionCollapsed] = useState(false);
    const [isVisitSectionCollapsed, setIsVisitSectionCollapsed] = useState(false);
    const deliveryTypes: Visit['type'][] = ['Sample', 'Sittu', 'Over'];
    const visitStatuses: Visit['status'][] = ['Pending', 'Completed', 'Cancelled'];
    const todayDate = new Date();
    const todayString = todayDate.toISOString().split('T')[0];
    const thisWeekStart = startOfWeek(todayDate).toISOString().split('T')[0];
    const thisWeekEnd = endOfWeek(todayDate).toISOString().split('T')[0];
    const thisMonthStart = startOfMonth(todayDate).toISOString().split('T')[0];
    const thisMonthEnd = endOfMonth(todayDate).toISOString().split('T')[0];
    const lastMonthStart = startOfMonth(subMonths(todayDate, 1)).toISOString().split('T')[0];
    const lastMonthEnd = endOfMonth(subMonths(todayDate, 1)).toISOString().split('T')[0];
    const [visitDateRange, setVisitDateRange] = useState<{ start: string, end: string }>({ start: '', end: '' });
    const [activeVisitDateFilter, setActiveVisitDateFilter] = useState<ActiveVisitDateFilter>('Today');
    const [visitSearchTerm, setVisitSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('All');
    const [selectedType, setSelectedType] = useState<string>('All');
    const [selectedRefId, setSelectedRefId] = useState<string>('All');
    const [sortField, setSortField] = useState<keyof Visit>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [refSearchTerm, setRefSearchTerm] = useState('');
    const [refJoinedDateRange, setRefJoinedDateRange] = useState<{ start: string, end: string }>({ start: '', end: '' });
    const [activeRefDateFilter, setActiveRefDateFilter] = useState<ActiveRefDateFilter>('All');

    // --- (Keep unchanged code: Effects, Filter Counts, Filtering Logic) ---
     useEffect(() => {
        setVisitDateRange({ start: todayString, end: todayString }); setActiveVisitDateFilter('Today'); setRefJoinedDateRange({ start: '', end: '' }); setActiveRefDateFilter('All'); setIsLoading(true); setIsDataReady(false); let visitsLoaded = false; let usersLoaded = false; const checkDataReady = () => { if (visitsLoaded && usersLoaded) { setIsLoading(false); setIsDataReady(true); } };
        const fetchVisits = async () => { try { const { data, error } = await supabase.from('visits').select('*').order('date', { ascending: false }); if (error) throw error; setVisits(data || []); setSortField('date'); setSortDirection('desc'); } catch (error) { console.error('Error fetching visits:', error); } finally { visitsLoaded = true; checkDataReady(); } };
        const fetchUsers = async () => { try { const { data, error } = await supabase.from('users').select('*'); if (error) throw error; const fetchedUsers = data || []; setUsers(fetchedUsers); setAllRefs(fetchedUsers.filter(u => u.role === 'Ref').sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''))); } catch (error) { console.error('Error fetching users:', error); } finally { usersLoaded = true; checkDataReady(); } };
        fetchVisits(); fetchUsers();
    }, []);
    const activeVisitFilterCount = useMemo(() => { let count = 0; if (visitSearchTerm) count++; if (activeVisitDateFilter !== 'Today' || visitDateRange.start !== todayString || visitDateRange.end !== todayString) { if (activeVisitDateFilter !== 'All' || visitDateRange.start || visitDateRange.end) { count++; } } if (selectedStatus !== 'All') count++; if (selectedType !== 'All') count++; if (selectedRefId !== 'All') count++; return count; }, [visitSearchTerm, activeVisitDateFilter, visitDateRange, selectedStatus, selectedType, selectedRefId, todayString]);
    const activeRefFilterCount = useMemo(() => { let count = 0; if (refSearchTerm) count++; if (activeRefDateFilter !== 'All' || refJoinedDateRange.start || refJoinedDateRange.end) { if(activeRefDateFilter !== 'All') count++; else if (refJoinedDateRange.start || refJoinedDateRange.end) count++; } return count; }, [refSearchTerm, activeRefDateFilter, refJoinedDateRange]);
    const filteredRefs = useMemo(() => { const lowerSearchTerm = refSearchTerm.toLowerCase(); return allRefs.filter(ref => { let dateMatch = true; if (activeRefDateFilter !== 'All' && refJoinedDateRange.start && refJoinedDateRange.end && ref.created_at) { try { const start = parseISO(refJoinedDateRange.start); const end = parseISO(refJoinedDateRange.end); const refJoinedDate = parseISO(ref.created_at); end.setHours(23, 59, 59, 999); dateMatch = isWithinInterval(refJoinedDate, { start, end }); } catch (e) { console.warn("Error parsing Ref joined dates:", e); dateMatch = false; } } else if (activeRefDateFilter !== 'All') { dateMatch = false; } if (!dateMatch) return false; if (!refSearchTerm) return true; const fullName = `${ref.first_name || ''} ${ref.last_name || ''}`.toLowerCase(); const email = ref.email?.toLowerCase() || ''; return fullName.includes(lowerSearchTerm) || email.includes(lowerSearchTerm); }); }, [allRefs, refSearchTerm, activeRefDateFilter, refJoinedDateRange]);
    const filteredAndSortedVisits = useMemo(() => { const lowerSearchTerm = visitSearchTerm.toLowerCase(); const finalFiltered = visits .filter(visit => { if (activeVisitDateFilter === 'All') return true; if (!visitDateRange.start || !visitDateRange.end) return activeVisitDateFilter === 'All'; const visitDateStr = visit.date.split('T')[0]; try { const start = parseISO(visitDateRange.start); const end = parseISO(visitDateRange.end); const current = parseISO(visitDateStr); end.setHours(23, 59, 59, 999); return isWithinInterval(current, { start, end }); } catch (e) { console.warn("Error parsing visit dates:", e); return false; } }) .filter(visit => selectedStatus === 'All' || visit.status === selectedStatus) .filter(visit => selectedType === 'All' || visit.type === selectedType) .filter(visit => selectedRefId === 'All' || (selectedRefId === 'None' ? !visit.ref_id : visit.ref_id === selectedRefId)) .filter(visit => { if (!visitSearchTerm) return true; const refUser = users.find(u => u.id === visit.ref_id); const refName = refUser ? `${refUser.first_name || ''} ${refUser.last_name || ''}`.toLowerCase() : ''; const itemsString = visit.item_id?.join(', ').toLowerCase() || ''; return (visit.buyer_name?.toLowerCase().includes(lowerSearchTerm) || visit.mobile_phone?.toLowerCase().includes(lowerSearchTerm) || visit.land_phone?.toLowerCase().includes(lowerSearchTerm) || visit.address?.toLowerCase().includes(lowerSearchTerm) || visit.type?.toLowerCase().includes(lowerSearchTerm) || refName.includes(lowerSearchTerm) || itemsString.includes(lowerSearchTerm) || visit.notes?.toLowerCase().includes(lowerSearchTerm) || visit.status?.toLowerCase().includes(lowerSearchTerm) ); }); return finalFiltered.sort((a, b) => { const fieldA = a[sortField] ?? ''; const fieldB = b[sortField] ?? ''; let comparison = 0; if (fieldA < fieldB) comparison = -1; else if (fieldA > fieldB) comparison = 1; return sortDirection === 'asc' ? comparison : comparison * -1; }); }, [visits, activeVisitDateFilter, visitDateRange, visitSearchTerm, selectedStatus, selectedType, selectedRefId, users, sortField, sortDirection]);

    // --- (Keep unchanged code: Stats Calc, Handlers, Formatters, Form Helpers) ---
    const stats = useMemo(() => ({ today: visits.filter(v => v.date.split('T')[0] === todayString).length, thisWeek: visits.filter(v => { const visitDateStr = v.date.split('T')[0]; return visitDateStr >= thisWeekStart && visitDateStr <= thisWeekEnd; }).length, completed: visits.filter(v => v.status === 'Completed').length, total: visits.length, refs: allRefs.length, }), [visits, allRefs.length, todayString, thisWeekStart, thisWeekEnd]);
    const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    const handleSort = (field: keyof Visit) => { const newDirection = (sortField === field && sortDirection === 'asc') ? 'desc' : 'asc'; setSortField(field); setSortDirection(newDirection); };
    const setVisitThisWeekRange = () => { setVisitDateRange({ start: thisWeekStart, end: thisWeekEnd }); setActiveVisitDateFilter('This Week'); };
    const setVisitTodayRange = () => { setVisitDateRange({ start: todayString, end: todayString }); setActiveVisitDateFilter('Today'); };
    const handleVisitShowAllClick = () => { setVisitDateRange({ start: '', end: ''}); setActiveVisitDateFilter('All'); };
    const handleVisitDateChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => { const newDateRange = { ...visitDateRange, [type]: e.target.value }; if (type === 'start' && newDateRange.end && newDateRange.start > newDateRange.end) newDateRange.end = newDateRange.start; if (type === 'end' && newDateRange.start && newDateRange.end < newDateRange.start) newDateRange.start = newDateRange.end; setVisitDateRange(newDateRange); setActiveVisitDateFilter('Custom'); };
    const resetVisitFilters = () => { setVisitTodayRange(); setVisitSearchTerm(''); setSelectedStatus('All'); setSelectedType('All'); setSelectedRefId('All'); setShowVisitFilters(false); };
    const setRefJoinedThisMonth = () => { setRefJoinedDateRange({ start: thisMonthStart, end: thisMonthEnd }); setActiveRefDateFilter('This Month'); };
    const setRefJoinedLastMonth = () => { setRefJoinedDateRange({ start: lastMonthStart, end: lastMonthEnd }); setActiveRefDateFilter('Last Month'); };
    const setRefJoinedAllTime = () => { setRefJoinedDateRange({ start: '', end: ''}); setActiveRefDateFilter('All'); };
    const handleRefDateChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => { const newDateRange = { ...refJoinedDateRange, [type]: e.target.value }; if (type === 'start' && newDateRange.end && newDateRange.start > newDateRange.end) newDateRange.end = newDateRange.start; if (type === 'end' && newDateRange.start && newDateRange.end < newDateRange.start) newDateRange.start = newDateRange.end; setRefJoinedDateRange(newDateRange); setActiveRefDateFilter('Custom'); };
    const resetRefFilters = () => { setRefSearchTerm(''); setRefJoinedAllTime(); setShowRefFilters(false); };
    const handleDeleteRef = async (refId: string) => { if (!window.confirm(`Delete Ref?`)) return; setIsDeletingRef(refId); try { const { data: assignedVisits, error: checkError } = await supabase.from('visits').select('id').eq('ref_id', refId).limit(1); if (checkError) throw checkError; if (assignedVisits && assignedVisits.length > 0) { alert('Cannot delete Ref: Assigned to visits.'); setIsDeletingRef(null); return; } const { error: deleteError } = await supabase.from('users').delete().eq('id', refId); if (deleteError) throw deleteError; setAllRefs(prevRefs => prevRefs.filter(ref => ref.id !== refId)); setUsers(prevUsers => prevUsers.filter(user => user.id !== refId)); alert('Ref deleted.'); } catch (error: any) { console.error('Error deleting ref:', error); alert(`Failed to delete ref: ${error.message}`); } finally { setIsDeletingRef(null); } };
    const handleEditClick = (visit: Visit) => { setEditingVisitId(visit.id); setEditedVisitData({ ...visit, item_id_string: Array.isArray(visit.item_id) ? visit.item_id.join(', ') : (visit.item_id ?? ''), }); };
    const handleCancelEdit = () => { setEditingVisitId(null); setEditedVisitData({}); };
    const handleSaveVisit = async () => { if (!editingVisitId || !editedVisitData) return; const { id, location, item_id_string, ...updateData } = editedVisitData; if (!updateData.buyer_name?.trim()) return alert("Buyer name cannot be empty."); if (!updateData.mobile_phone?.trim()) return alert("Mobile phone cannot be empty."); const finalUpdateData: Partial<Visit> = { ...updateData, item_id: item_id_string?.split(',').map(s => s.trim()).filter(Boolean) ?? null, notes: updateData.notes?.trim() || null, address: updateData.address?.trim() || null, land_phone: updateData.land_phone?.trim() || null, }; try { const { data, error } = await supabase.from('visits').update(finalUpdateData).eq('id', editingVisitId).select().single(); if (error) throw error; setVisits(prevVisits => prevVisits.map(v => (v.id === editingVisitId ? { ...v, ...data } : v))); handleCancelEdit(); } catch (error: any) { console.error('Error updating visit:', error); alert(`Failed to update visit: ${error.message}`); } };
    const handleDeleteVisit = async (visitId: string) => { if (!window.confirm('Delete visit?')) return; try { const { error } = await supabase.from('visits').delete().eq('id', visitId); if (error) throw error; setVisits(prevVisits => prevVisits.filter(v => v.id !== visitId)); if (editingVisitId === visitId) { handleCancelEdit(); } } catch (error: any) { console.error('Error deleting visit:', error); alert(`Failed to delete visit: ${error.message}`); } };
    const formatDateDisplay = (d: string | null | undefined): string => { if (!d) return 'N/A'; try {return format(parseISO(d), 'MMM d, yyyy')} catch(e){return d.split('T')[0]} };
    const formatRelativeDate = (d: string | null | undefined): string => { if (!d) return 'N/A'; try {return formatDistanceToNow(parseISO(d), { addSuffix: true })} catch(e){return 'Invalid date'} };
    const getInputValue = (key: keyof typeof editedVisitData) => editedVisitData?.[key] ?? '';
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, key: keyof Visit) => { if (editingVisitId) { setEditedVisitData(prev => ({ ...prev, [key]: e.target.value })); } };
    const handleItemIdChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (editingVisitId) { setEditedVisitData(prev => ({ ...prev, item_id_string: e.target.value })); } };

    // --- (Keep unchanged code: Component Renderers (Card Views)) ---
    const renderRefRowAsCard = (ref: UserType) => { return ( <div key={ref.id} className="card card-compact bg-white border border-neutral-200 shadow-sm mb-3"> <div className="card-body text-sm"> <div className="flex justify-between items-start gap-2"> <div> <h3 className="font-semibold text-base text-neutral-800"> <HighlightMatch text={`${ref.first_name || ''} ${ref.last_name || ''}`} highlight={refSearchTerm} /> </h3> <p className="text-neutral-600 text-xs"> <HighlightMatch text={ref.email} highlight={refSearchTerm} /> </p> </div> <span className={`badge ${ref.role === 'Admin' ? 'badge-primary' : 'badge-warning'} badge-outline badge-sm mt-1`}>{ref.role}</span> </div> <div className="text-xs text-neutral-500 mt-1"> <Clock size={12} className="inline mr-1" /> Joined: {formatDateDisplay(ref.created_at)} ({formatRelativeDate(ref.created_at)}) </div> <div className="card-actions justify-end mt-2"> <button onClick={() => handleDeleteRef(ref.id)} disabled={isDeletingRef === ref.id || isLoading} className="btn btn-xs btn-ghost text-error hover:bg-error/10" title={`Delete Ref ${ref.first_name}`}> {isDeletingRef === ref.id ? <span className="loading loading-spinner loading-xs"></span> : <Trash2 size={16} />} <span className="ml-1">Delete</span> </button> </div> </div> </div> ); };
    const renderVisitRowAsCard = (visit: Visit) => { const isEditing = editingVisitId === visit.id; const refUser = users.find(u => u.id === visit.ref_id); const refFullName = refUser ? `${refUser.first_name || ''} ${refUser.last_name || ''}` : ''; return ( <div key={visit.id} className={`card card-compact border shadow-sm mb-4 ${isEditing ? 'bg-blue-50 border-blue-200' : 'bg-white border-neutral-200'}`}> <div className="card-body text-sm p-4"> {!isEditing && ( <> <div className="flex justify-between items-start gap-2 mb-2"> <div> <h3 className="font-semibold text-base text-neutral-800"> <HighlightMatch text={visit.buyer_name} highlight={visitSearchTerm} /> </h3> <p className="text-xs text-neutral-500">{formatDateDisplay(visit.date)}</p> </div> <span className={`badge badge-sm mt-1 ${visit.status === 'Completed' ? 'badge-success' : visit.status === 'Pending' ? 'badge-warning' : visit.status === 'Cancelled' ? 'badge-error' : 'badge-ghost'} badge-outline`}> {visit.status === 'Completed' ? <Check size={12} className="mr-1"/> : visit.status === 'Cancelled' ? <X size={12} className="mr-1"/> : null} <HighlightMatch text={visit.status} highlight={visitSearchTerm} /> </span> </div> <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3"> <div className="text-neutral-700"><Phone size={12} className="inline mr-1 opacity-70"/> <HighlightMatch text={visit.mobile_phone} highlight={visitSearchTerm} />{visit.land_phone && <> / <HighlightMatch text={visit.land_phone} highlight={visitSearchTerm} /></>}</div> <div className="text-neutral-700"><Tag size={12} className="inline mr-1 opacity-70"/> <HighlightMatch text={visit.type} highlight={visitSearchTerm} /></div> {visit.address && <div className="col-span-2 text-neutral-600"><Home size={12} className="inline mr-1 opacity-70"/> <HighlightMatch text={visit.address} highlight={visitSearchTerm} /></div>} {refUser && <div className="text-neutral-600"><User size={12} className="inline mr-1 opacity-70"/> Ref: <HighlightMatch text={refFullName} highlight={visitSearchTerm} /></div>} {visit.item_id && visit.item_id.length > 0 && <div className="col-span-2 text-neutral-600"><Tag size={12} className="inline mr-1 opacity-70"/> Items: <HighlightMatch text={visit.item_id.join(', ')} highlight={visitSearchTerm} /></div>} {visit.notes && <div className="col-span-2 text-neutral-600 mt-1 italic border-l-2 border-neutral-200 pl-2"><Edit3 size={12} className="inline mr-1 opacity-70"/> <HighlightMatch text={visit.notes} highlight={visitSearchTerm} /></div>} </div> <div className="card-actions justify-end items-center gap-1"> <a href={`https://www.google.com/maps/dir/?api=1&destination=${visit.location?.lat},${visit.location?.lng}`} className={`btn btn-xs btn-ghost text-info hover:bg-info/10 ${!visit.location?.lat ? 'disabled' : ''}`} target="_blank" rel="noopener noreferrer" title="Open Map"><MapPin size={16} /> <span className="hidden sm:inline ml-1">Map</span></a> <button onClick={() => handleEditClick(visit)} disabled={!!editingVisitId} className="btn btn-xs btn-ghost text-accent hover:bg-accent/10" title="Edit Visit"><Edit size={16} /> <span className="hidden sm:inline ml-1">Edit</span></button> <button onClick={() => handleDeleteVisit(visit.id)} disabled={!!editingVisitId || isLoading} className="btn btn-xs btn-ghost text-error hover:bg-error/10" title="Delete Visit"><Trash2 size={16} /> <span className="hidden sm:inline ml-1">Delete</span></button> </div> </> )} {isEditing && ( <div className="space-y-3"> <h3 className="font-semibold text-base text-neutral-800 mb-1">Editing Visit...</h3> <p className="text-xs text-neutral-600">Use the table view for detailed editing.</p> <div className="card-actions justify-end mt-4 gap-2"> <button onClick={handleCancelEdit} className="btn btn-sm btn-ghost">Cancel</button> </div> </div> )} </div> </div> ); };

    // --- (Keep unchanged code: Input Styles for Inline Editing) ---
    const inputClass = "input input-xs border-neutral-300 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none w-full bg-white px-2 py-1 shadow-sm";
    const selectClass = "select select-xs border-neutral-300 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none w-full bg-white px-2 py-1 shadow-sm font-normal";
    const textareaClass = "textarea textarea-xs border-neutral-300 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none w-full bg-white px-2 py-1 shadow-sm min-h-[30px]";

    // --- Main JSX ---
    return (
        // Outer container - Assuming this is now full width based on previous step
        <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100/50 py-6 sm:py-8 lg:py-10 animate-fade-in">
            {/* Inner container - May have padding added back if desired */}
            <div className="space-y-6 sm:space-y-8 px-4 sm:px-6 lg:px-8"> {/* Added padding back here for general spacing */}
                {/* Header (Unchanged) */}
                <header className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">Admin Dashboard</h1>
                    <p className="text-sm sm:text-base text-neutral-600 mt-1">{format(todayDate, 'EEEE, MMM do, yyyy')}</p>
                </header>

                {/* Stats Cards (Unchanged) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                    {[ { title: "Today's Visits", value: stats.today, icon: MapPin, color: "info" }, { title: "This Week", value: stats.thisWeek, icon: Calendar, color: "primary" }, { title: "Completion Rate", value: `${completionRate}%`, icon: BarChart2, color: "success" }, { title: "Active Refs", value: stats.refs, icon: Users, color: "warning" } ].map((stat, index) => (
                        <div key={index} className={`card bg-white p-5 shadow-md border-t-4 border-${stat.color}`}>
                            <div className="flex items-center justify-between">
                                <div className={`p-3 rounded-full bg-${stat.color}/10 text-${stat.color}`}><stat.icon size={22} /></div>
                                <div className="text-right"><p className="text-3xl font-semibold text-neutral-900">{stat.value}</p><h2 className="text-sm font-medium text-neutral-500 truncate">{stat.title}</h2></div>
                            </div>
                        </div>
                    ))}
                </div>

                 {/* Ref Management Card (w-full) */}
                 <div className="card w-full bg-white shadow-md border border-neutral-200/80 overflow-hidden">
                    {/* Card Header (Unchanged) */}
                    <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-200/80">
                        <div className="flex items-center gap-2"> <button onClick={() => setIsRefSectionCollapsed(!isRefSectionCollapsed)} className="btn btn-ghost btn-sm btn-circle -ml-2" title={isRefSectionCollapsed ? "Expand Ref Section" : "Collapse Ref Section"} aria-expanded={!isRefSectionCollapsed} aria-controls="ref-content-area"> {isRefSectionCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />} </button> <h2 className="text-lg sm:text-xl font-semibold text-neutral-800">Ref Management</h2> </div>
                        <div className='flex flex-wrap items-center gap-2'> <div className="relative w-full sm:w-auto order-last sm:order-first"> <input id="refSearchInput" type="text" placeholder="Search Refs..." value={refSearchTerm} onChange={(e) => setRefSearchTerm(e.target.value)} className="input input-sm input-bordered w-full sm:w-52 pl-8" disabled={!isDataReady} aria-label="Search Refs by Name or Email"/> <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" /> {refSearchTerm && ( <button onClick={() => setRefSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-xs btn-ghost btn-circle" title="Clear search" aria-label="Clear ref search"><X size={14} /></button> )} </div> <button onClick={() => setShowRefFilters(!showRefFilters)} className={`btn btn-sm ${showRefFilters ? 'btn-primary' : 'btn-outline btn-secondary'} relative`} aria-controls="ref-filters-section" aria-expanded={showRefFilters}> <ListFilter size={16} /> <span className='ml-1 mr-1'>Filters</span> {showRefFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />} {activeRefFilterCount > 0 && !showRefFilters && ( <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-secondary rounded-full">{activeRefFilterCount}</span> )} </button> </div>
                    </div>

                    {/* Ref Content Area (Unchanged) */}
                    {!isRefSectionCollapsed && (
                        <div id="ref-content-area" className="p-4 sm:p-6 pt-4 transition-all duration-300 ease-in-out">
                            {/* (Keep unchanged code: Ref Filters Section) */}
                            {showRefFilters && ( <div id="ref-filters-section" className="bg-neutral-50 p-4 rounded-lg mb-6 border border-neutral-200/80 animate-fade-in-down"> <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end"> <div className="space-y-2 md:col-span-3"> <label className="block text-sm font-medium text-neutral-700">Filter by Joined Date</label> <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] items-center gap-2"> <input id="refStartDate" type="date" value={refJoinedDateRange.start} onChange={(e) => handleRefDateChange(e, 'start')} className="input input-sm input-bordered w-full" aria-label="Ref joined start date"/> <span className="text-neutral-500 text-center hidden sm:inline">to</span> <input id="refEndDate" type="date" value={refJoinedDateRange.end} min={refJoinedDateRange.start} onChange={(e) => handleRefDateChange(e, 'end')} className="input input-sm input-bordered w-full" aria-label="Ref joined end date"/> </div> <div className="flex flex-wrap gap-2 pt-1"> <button onClick={setRefJoinedThisMonth} className={`btn btn-xs ${activeRefDateFilter === 'This Month' ? 'btn-primary' : 'btn-outline btn-neutral'}`}>This Month</button> <button onClick={setRefJoinedLastMonth} className={`btn btn-xs ${activeRefDateFilter === 'Last Month' ? 'btn-primary' : 'btn-outline btn-neutral'}`}>Last Month</button> <button onClick={setRefJoinedAllTime} className={`btn btn-xs ${activeRefDateFilter === 'All' ? 'btn-primary' : 'btn-outline btn-neutral'}`}>All Time</button> {activeRefDateFilter === 'Custom' && (<span className="text-xs text-info-600 self-center font-medium ml-2">(Custom Range Selected)</span>)} </div> </div> <div className="md:col-span-2 flex justify-end items-end h-full"> <button onClick={resetRefFilters} className="btn btn-sm btn-ghost text-primary hover:bg-primary/10"> <RefreshCw size={16} className="mr-1" /> Reset Ref Filters </button> </div> </div> </div> )}
                            {/* (Keep unchanged code: Ref Loading/Empty/Content) */}
                            {isLoading && !isDataReady && ( <div className="text-center py-10"> <span className="loading loading-lg loading-spinner text-primary"></span> <p className="mt-3 text-neutral-600">Loading Ref data...</p> </div> )}
                            {!isLoading && allRefs.length === 0 && ( <div className="text-center py-8 text-neutral-500"> <Users size={40} className="mx-auto mb-3 opacity-50" /> No Ref users found. </div> )}
                            {!isLoading && allRefs.length > 0 && filteredRefs.length === 0 && ( <div className="text-center py-8 text-neutral-500"> <Search size={40} className="mx-auto mb-3 opacity-50" /> No Refs found matching your filters {activeRefFilterCount > 0 ? '.' : ' or search term.'} <button onClick={resetRefFilters} className="btn btn-xs btn-link ml-1 text-primary">Clear Ref Filters</button> </div> )}
                            {isDataReady && filteredRefs.length > 0 && (
                                <>
                                    <p className="text-xs text-neutral-500 mb-3"> Showing <span className="font-medium">{filteredRefs.length}</span> Ref{filteredRefs.length !== 1 ? 's' : ''} {activeRefFilterCount > 0 ? ` (filtered from ${allRefs.length})` : ''}. </p>
                                    {/* (Keep unchanged code: Mobile Card View) */}
                                    <div className="md:hidden space-y-3"> {filteredRefs.map(renderRefRowAsCard)} </div>

                                    {/* === REVISED Ref Table (Desktop - md:block) === */}
                                    <div className="hidden md:block overflow-x-auto border border-neutral-300 rounded-md">
                                        {/* Using table-fixed with w-full. Widths defined in headers */}
                                        <table className="table-fixed w-full text-sm border-collapse">
                                            <thead className="text-neutral-700 text-xs uppercase bg-neutral-100">
                                                <tr>
                                                    {/* Use w-auto for columns that should expand */}
                                                    <th className="w-auto px-3 py-2 border border-neutral-300 text-left font-semibold">Name</th>
                                                    <th className="w-auto px-3 py-2 border border-neutral-300 text-left font-semibold">Email</th>
                                                    {/* Relative or fixed width for others */}
                                                    <th className="w-1/6 px-3 py-2 border border-neutral-300 text-left font-semibold">Joined</th>
                                                    <th className="w-20 px-3 py-2 border border-neutral-300 text-left font-semibold">Role</th> {/* Fixed width */}
                                                    <th className="w-20 px-3 py-2 border border-neutral-300 text-center font-semibold">Actions</th>{/* Fixed width */}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-neutral-200">
                                                {filteredRefs.map((ref) => (
                                                    <tr key={ref.id} className="odd:bg-white even:bg-neutral-50/70 hover:bg-blue-50 transition-colors duration-150">
                                                        {/* Add overflow-hidden for truncate to work correctly in table-fixed */}
                                                        <td className="px-3 py-2 border border-neutral-300 font-medium whitespace-nowrap overflow-hidden truncate">
                                                            <HighlightMatch text={`${ref.first_name || ''} ${ref.last_name || ''}`} highlight={refSearchTerm} />
                                                        </td>
                                                        <td className="px-3 py-2 border border-neutral-300 text-neutral-600 whitespace-nowrap overflow-hidden truncate">
                                                            <HighlightMatch text={ref.email} highlight={refSearchTerm} />
                                                        </td>
                                                        <td className="px-3 py-2 border border-neutral-300 text-neutral-500 whitespace-nowrap" title={formatDateDisplay(ref.created_at)}>
                                                            {formatRelativeDate(ref.created_at)}
                                                        </td>
                                                        <td className="px-3 py-2 border border-neutral-300">
                                                            <span className={`badge ${ref.role === 'Admin' ? 'badge-primary' : 'badge-warning'} badge-outline badge-sm`}>{ref.role}</span>
                                                        </td>
                                                        <td className="px-3 py-2 border border-neutral-300 text-center whitespace-nowrap">
                                                            <button onClick={() => handleDeleteRef(ref.id)} disabled={isDeletingRef === ref.id || isLoading} className="btn btn-xs btn-ghost text-error hover:bg-error/10 tooltip tooltip-left" data-tip={`Delete ${ref.first_name}`}> {isDeletingRef === ref.id ? <span className="loading loading-spinner loading-xs"></span> : <Trash2 size={16} />} </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* === END REVISED Ref Table === */}
                                </>
                            )}
                        </div>
                    )}
                 </div>


                {/* Visit Records Card (w-full) */}
                <div className="card w-full bg-white shadow-md border border-neutral-200/80 overflow-hidden">
                     {/* Card Header (Unchanged) */}
                    <div className="flex items-center justify-between p-4 sm:p-6 border-b border-neutral-200/80">
                         <div className="flex items-center gap-2"> <button onClick={() => setIsVisitSectionCollapsed(!isVisitSectionCollapsed)} className="btn btn-ghost btn-sm btn-circle -ml-2" title={isVisitSectionCollapsed ? "Expand Visit Section" : "Collapse Visit Section"} aria-expanded={!isVisitSectionCollapsed} aria-controls="visit-content-area"> {isVisitSectionCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />} </button> <h2 className="text-lg sm:text-xl font-semibold text-neutral-800">Visit Records</h2> </div>
                        <div className='flex flex-wrap items-center gap-2'> <div className="relative w-full sm:w-auto order-last sm:order-first"> <input id="visitSearchInput" type="text" placeholder="Search Visits..." value={visitSearchTerm} onChange={(e) => setVisitSearchTerm(e.target.value)} className="input input-sm input-bordered w-full sm:w-52 pl-8" disabled={!isDataReady} aria-label="Search Visits"/> <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" /> {visitSearchTerm && ( <button onClick={() => setVisitSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-xs btn-ghost btn-circle" title="Clear search" aria-label="Clear visit search"><X size={14} /></button> )} </div> <button onClick={() => setShowVisitFilters(!showVisitFilters)} className={`btn btn-sm ${showVisitFilters ? 'btn-primary' : 'btn-outline btn-secondary'} relative`} aria-controls="visit-filters-section" aria-expanded={showVisitFilters}> <ListFilter size={16} /> <span className='ml-1 mr-1'>Filters</span> {showVisitFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />} {activeVisitFilterCount > 0 && !showVisitFilters && ( <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-secondary rounded-full">{activeVisitFilterCount}</span> )} </button> </div>
                    </div>

                    {/* Visit Content Area (Unchanged) */}
                    {!isVisitSectionCollapsed && (
                        <div id="visit-content-area" className="p-4 sm:p-6 pt-4 transition-all duration-300 ease-in-out">
                            {/* (Keep unchanged code: Visit Filters Section) */}
                            {showVisitFilters && ( <div id="visit-filters-section" className="bg-neutral-50 p-4 rounded-lg mb-6 border border-neutral-200/80 animate-fade-in-down"> <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-x-4 gap-y-5 items-end"> <div className="space-y-2 lg:col-span-3"> <label className="block text-sm font-medium text-neutral-700">Filter by Visit Date</label> <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] items-center gap-2"> <input id="visitStartDate" type="date" value={visitDateRange.start} onChange={(e) => handleVisitDateChange(e, 'start')} className="input input-sm input-bordered w-full" aria-label="Visit start date"/> <span className="text-neutral-500 text-center hidden sm:inline">to</span> <input id="visitEndDate" type="date" value={visitDateRange.end} min={visitDateRange.start} onChange={(e) => handleVisitDateChange(e, 'end')} className="input input-sm input-bordered w-full" aria-label="Visit end date"/> </div> <div className="flex flex-wrap gap-2 pt-1"> <button onClick={setVisitTodayRange} className={`btn btn-xs ${activeVisitDateFilter === 'Today' ? 'btn-primary' : 'btn-outline btn-neutral'}`}>Today</button> <button onClick={setVisitThisWeekRange} className={`btn btn-xs ${activeVisitDateFilter === 'This Week' ? 'btn-primary' : 'btn-outline btn-neutral'}`}>This Week</button> <button onClick={handleVisitShowAllClick} className={`btn btn-xs ${activeVisitDateFilter === 'All' ? 'btn-primary' : 'btn-outline btn-neutral'}`}>All Dates</button> {activeVisitDateFilter === 'Custom' && (<span className="text-xs text-info-600 self-center font-medium ml-2">(Custom Range Selected)</span>)} </div> </div> <div className="lg:col-span-1"> <label htmlFor="visitStatusFilter" className="block text-sm font-medium text-neutral-700 mb-1">Status</label> <select id="visitStatusFilter" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="select select-sm select-bordered w-full"> <option value="All">All Statuses</option> {visitStatuses.map(status => <option key={status} value={status}>{status}</option>)} </select> </div> <div className="lg:col-span-1"> <label htmlFor="visitTypeFilter" className="block text-sm font-medium text-neutral-700 mb-1">Type</label> <select id="visitTypeFilter" value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="select select-sm select-bordered w-full"> <option value="All">All Types</option> {deliveryTypes.map(type => <option key={type} value={type}>{type}</option>)} </select> </div> <div className="lg:col-span-2"> <label htmlFor="visitRefFilter" className="block text-sm font-medium text-neutral-700 mb-1">Assigned Ref</label> <select id="visitRefFilter" value={selectedRefId} onChange={(e) => setSelectedRefId(e.target.value)} className="select select-sm select-bordered w-full" disabled={allRefs.length === 0}> <option value="All">All Refs</option> <option value="None">None (Unassigned)</option> {allRefs.map(ref => <option key={ref.id} value={ref.id}>{ref.first_name} {ref.last_name}</option>)} </select> </div> <div className="sm:col-span-2 lg:col-span-6 flex justify-end items-end h-full mt-2 sm:mt-0"> <button onClick={resetVisitFilters} className="btn btn-sm btn-ghost text-primary hover:bg-primary/10 w-full sm:w-auto"> <RefreshCw size={16} className="mr-1" /> Reset Visit Filters </button> </div> </div> </div> )}

                            {/* (Keep unchanged code: Visit Loading/Empty/Content) */}
                             {isLoading && !isDataReady && ( <div className="text-center py-16"> <span className="loading loading-lg loading-spinner text-primary"></span> <p className="mt-3 text-neutral-600">Loading Visit records...</p> </div> )}
                             {!isLoading && isDataReady && filteredAndSortedVisits.length === 0 && ( <div className="text-center py-12 border border-dashed border-neutral-300 rounded-lg"> <Calendar size={40} className="mx-auto text-neutral-400 mb-4" /> <p className="text-neutral-600 mb-4"> No visits found matching your current filters {activeVisitFilterCount > 0 ? '.' : ' or search term.'} </p> {activeVisitFilterCount > 0 && ( <button onClick={resetVisitFilters} className="btn btn-sm btn-primary"><RefreshCw size={16} className="mr-1" /> Reset Visit Filters</button> )} </div> )}
                            {isDataReady && filteredAndSortedVisits.length > 0 && (
                                <>
                                    <p className="text-xs text-neutral-500 mb-3"> Showing <span className="font-medium">{filteredAndSortedVisits.length}</span> visit{filteredAndSortedVisits.length !== 1 ? 's' : ''} {activeVisitFilterCount > 0 ? ` (filtered from ${visits.length})` : ''}. </p>
                                    {/* (Keep unchanged code: Mobile Card View) */}
                                    <div className="lg:hidden space-y-4"> {filteredAndSortedVisits.map(renderVisitRowAsCard)} </div>

                                    {/* === REVISED Visit Table (Desktop - lg:block) === */}
                                    <div className="hidden lg:block overflow-x-auto border border-neutral-300 rounded-md">
                                        {/* Using table-fixed with w-full. Widths defined in headers */}
                                        <table className="table-fixed w-full text-sm border-collapse">
                                            <thead className="text-neutral-700 text-xs uppercase bg-neutral-100">
                                                <tr>
                                                    {/* Define widths - use fixed for small/predictable, auto/relative for expanding */}
                                                    <th className="w-28 px-3 py-2 border border-neutral-300 text-left font-semibold cursor-pointer hover:bg-neutral-200/60 whitespace-nowrap" onClick={() => handleSort('date')}>
                                                        Date {sortField === 'date' && (sortDirection === 'asc' ? <ArrowUp size={12} className="inline ml-1"/> : <ArrowDown size={12} className="inline ml-1"/>)}
                                                    </th>
                                                    <th className="w-44 px-3 py-2 border border-neutral-300 text-left font-semibold cursor-pointer hover:bg-neutral-200/60" onClick={() => handleSort('buyer_name')}> {/* Slightly smaller fixed */}
                                                        Buyer {sortField === 'buyer_name' && (sortDirection === 'asc' ? <ArrowUp size={12} className="inline ml-1"/> : <ArrowDown size={12} className="inline ml-1"/>)}
                                                    </th>
                                                    <th className="w-36 px-3 py-2 border border-neutral-300 text-left font-semibold whitespace-nowrap">Contact</th> {/* Slightly smaller fixed */}
                                                    <th className="w-auto px-3 py-2 border border-neutral-300 text-left font-semibold">Address</th> {/* Auto width */}
                                                    <th className="w-24 px-3 py-2 border border-neutral-300 text-left font-semibold">Type</th> {/* Fixed width */}
                                                    <th className="w-36 px-3 py-2 border border-neutral-300 text-left font-semibold hidden xl:table-cell">Ref</th> {/* Smaller fixed width */}
                                                    <th className="w-auto px-3 py-2 border border-neutral-300 text-left font-semibold hidden xl:table-cell">Item IDs</th> {/* Auto width */}
                                                    <th className="w-auto px-3 py-2 border border-neutral-300 text-left font-semibold hidden xl:table-cell">Notes</th> {/* Auto width */}
                                                    <th className="w-28 px-3 py-2 border border-neutral-300 text-left font-semibold cursor-pointer hover:bg-neutral-200/60" onClick={() => handleSort('status')}> {/* Smaller fixed */}
                                                        Status {sortField === 'status' && (sortDirection === 'asc' ? <ArrowUp size={12} className="inline ml-1"/> : <ArrowDown size={12} className="inline ml-1"/>)}
                                                    </th>
                                                    <th className="w-24 px-3 py-2 border border-neutral-300 text-center font-semibold">Actions</th> {/* Fixed width */}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-neutral-200">
                                                {filteredAndSortedVisits.map(visit => {
                                                    const isEditing = editingVisitId === visit.id;
                                                    const refUser = users.find(u => u.id === visit.ref_id);
                                                    const displayData = isEditing ? editedVisitData : visit;
                                                    const refFullName = refUser ? `${refUser.first_name || ''} ${refUser.last_name || ''}` : '-';
                                                    const itemsString = isEditing ? (editedVisitData.item_id_string ?? '') : (visit.item_id?.join(', ') || '-');

                                                    return (
                                                        <tr key={visit.id} className={`align-top transition-colors duration-150 ${isEditing ? 'bg-blue-100' : 'odd:bg-white even:bg-neutral-50/70 hover:bg-blue-50'}`}>
                                                            {/* Date */}
                                                            <td className="px-3 py-1.5 border border-neutral-300 whitespace-nowrap"> {formatDateDisplay(visit.date)} </td>
                                                            {/* Buyer */}
                                                            <td className="px-3 py-1.5 border border-neutral-300 font-medium whitespace-nowrap overflow-hidden truncate"> {isEditing ? ( <input type="text" value={getInputValue('buyer_name')} onChange={e => handleInputChange(e, 'buyer_name')} placeholder="Buyer Name" className={inputClass} /> ) : ( <HighlightMatch text={visit.buyer_name} highlight={visitSearchTerm} /> )} </td>
                                                            {/* Contact */}
                                                            <td className="px-3 py-1.5 border border-neutral-300 text-neutral-600"> {isEditing ? ( <div className="space-y-1"> <input type="tel" value={getInputValue('mobile_phone')} onChange={e => handleInputChange(e, 'mobile_phone')} placeholder="Mobile" className={inputClass} /> <input type="tel" value={getInputValue('land_phone')} onChange={e => handleInputChange(e, 'land_phone')} placeholder="Landline (Opt)" className={inputClass} /> </div> ) : ( <> {visit.mobile_phone && <div className="flex items-center whitespace-nowrap"><Phone size={12} className="inline mr-1.5 opacity-70 flex-shrink-0"/><HighlightMatch text={visit.mobile_phone} highlight={visitSearchTerm} /></div>} {visit.land_phone && <div className="flex items-center mt-0.5 whitespace-nowrap"><Home size={12} className="inline mr-1.5 opacity-70 flex-shrink-0"/><HighlightMatch text={visit.land_phone} highlight={visitSearchTerm} /></div>} </> )} </td>
                                                            {/* Address - Allow wrapping */}
                                                            <td className="px-3 py-1.5 border border-neutral-300 text-neutral-600 break-words"> {isEditing ? ( <textarea value={getInputValue('address')} onChange={e => handleInputChange(e, 'address')} placeholder="Address" className={textareaClass} rows={1}></textarea> ) : ( <HighlightMatch text={visit.address} highlight={visitSearchTerm} /> )} </td>
                                                            {/* Type */}
                                                            <td className="px-3 py-1.5 border border-neutral-300"> {isEditing ? ( <select value={getInputValue('type')} onChange={e => handleInputChange(e, 'type')} className={selectClass}> {deliveryTypes.map(type => <option key={type} value={type}>{type}</option>)} </select> ) : ( <span className={`badge badge-sm ${visit.type === 'Sample' ? 'bg-blue-100 text-blue-800' : visit.type === 'Sittu' ? 'bg-pink-100 text-pink-800' : visit.type === 'Over' ? 'bg-green-100 text-green-800' : 'badge-ghost'}`}> <HighlightMatch text={visit.type} highlight={visitSearchTerm} /> </span> )} </td>
                                                            {/* Ref (Hidden on smaller screens) */}
                                                            <td className="px-3 py-1.5 border border-neutral-300 text-neutral-600 hidden xl:table-cell whitespace-nowrap overflow-hidden truncate"> {isEditing ? ( <select value={getInputValue('ref_id') ?? ''} onChange={e => handleInputChange(e, 'ref_id')} className={selectClass}> <option value="">None</option> {allRefs.map(ref => <option key={ref.id} value={ref.id}>{ref.first_name} {ref.last_name}</option>)} </select> ) : ( <HighlightMatch text={refFullName} highlight={visitSearchTerm} /> )} </td>
                                                            {/* Item IDs (Hidden on smaller screens) - Allow wrapping */}
                                                            <td className="px-3 py-1.5 border border-neutral-300 text-neutral-500 hidden xl:table-cell break-words"> {isEditing ? ( <input type="text" value={getInputValue('item_id_string')} onChange={handleItemIdChange} placeholder="item1, item2" className={inputClass} /> ) : ( <HighlightMatch text={itemsString} highlight={visitSearchTerm} /> )} </td>
                                                            {/* Notes (Hidden on smaller screens) - Allow wrapping */}
                                                            <td className="px-3 py-1.5 border border-neutral-300 text-neutral-500 hidden xl:table-cell break-words"> {isEditing ? ( <textarea value={getInputValue('notes')} onChange={e => handleInputChange(e, 'notes')} placeholder="Notes..." className={textareaClass} rows={1}></textarea> ) : ( <HighlightMatch text={visit.notes} highlight={visitSearchTerm} /> )} </td>
                                                            {/* Status */}
                                                            <td className="px-3 py-1.5 border border-neutral-300"> {isEditing ? ( <select value={getInputValue('status')} onChange={e => handleInputChange(e, 'status')} className={selectClass}> {visitStatuses.map(status => <option key={status} value={status}>{status}</option>)} </select> ) : ( <span className={`badge badge-sm ${visit.status === 'Completed' ? 'badge-success' : visit.status === 'Pending' ? 'badge-warning' : visit.status === 'Cancelled' ? 'badge-error' : 'badge-ghost'} badge-outline`}> {visit.status === 'Completed' ? <Check size={12} className="mr-1"/> : visit.status === 'Cancelled' ? <X size={12} className="mr-1"/> : null} <HighlightMatch text={visit.status} highlight={visitSearchTerm} /> </span> )} </td>
                                                            {/* Actions */}
                                                            <td className="px-3 py-1.5 border border-neutral-300 text-center whitespace-nowrap"> {isEditing ? ( <div className="flex items-center justify-center gap-1"> <button onClick={handleSaveVisit} disabled={isLoading} className="btn btn-xs btn-success btn-outline p-1" title="Save"> <Save size={16} /> </button> <button onClick={handleCancelEdit} className="btn btn-xs btn-ghost text-neutral-600 hover:bg-neutral-200 p-1" title="Cancel"> <X size={16} /> </button> </div> ) : ( <div className="flex items-center justify-center gap-0.5"> <a href={`https://www.google.com/maps/dir/?api=1&destination=${visit.location?.lat},${visit.location?.lng}`} className={`btn btn-xs btn-ghost text-info hover:bg-info/10 p-1 ${!visit.location?.lat ? 'opacity-30 cursor-not-allowed' : ''}`} target="_blank" rel="noopener noreferrer" title="Map" onClick={(e) => !visit.location?.lat && e.preventDefault()}> <MapPin size={16}/> </a> <button onClick={() => handleEditClick(visit)} disabled={!!editingVisitId && editingVisitId !== visit.id} className="btn btn-xs btn-ghost text-accent hover:bg-accent/10 p-1" title="Edit" aria-label={`Edit visit for ${visit.buyer_name}`}> <Edit size={16}/> </button> <button onClick={() => handleDeleteVisit(visit.id)} disabled={!!editingVisitId || isLoading} className="btn btn-xs btn-ghost text-error hover:bg-error/10 p-1" title="Delete" aria-label={`Delete visit for ${visit.buyer_name}`}> <Trash2 size={16}/> </button> </div> )} </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* === END REVISED Visit Table === */}
                                </>
                            )}
                        </div>
                    )}
                 </div> {/* End Visit Records Card */}

            </div> {/* End Inner Content Container */}
        </div> /* End Main Page Container */
    );
};

export default AdminDashboardPage;