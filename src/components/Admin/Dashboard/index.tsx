// Main Dashboard component that imports and renders all sections
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../supabaseClient';
import { Visit, User as UserType } from '../../../types';
import { Item, Route, EditingCellState } from '../types';
import {
    format, parseISO, startOfWeek, endOfWeek, isWithinInterval, formatDistanceToNow,
    startOfMonth, endOfMonth, subMonths
} from 'date-fns';

// Import dashboard sections
import DashboardStats from './DashboardStats';
import VisitsSection from './VisitsSection';
import RefsSection from './RefsSection';
import RoutesSection from './RoutesSection';
import ItemsSection from './ItemsSection';

// Utility component for highlighting search matches
export const HighlightMatch: React.FC<{ text: string | number | null | undefined; highlight: string | null | undefined }> = ({ text, highlight }) => {
    const textString = text === null || typeof text === 'undefined' ? '' : String(text);
    if (!highlight || !textString) { return <>{textString}</>; }
    const lowerText = textString.toLowerCase();
    const lowerHighlight = highlight.toLowerCase();
    const index = lowerText.indexOf(lowerHighlight);
    if (index === -1) { return <>{textString}</>; }
    const before = textString.substring(0, index);
    const match = textString.substring(index, index + highlight.length);
    const after = textString.substring(index + highlight.length);
    return ( <>{before}<mark className="bg-yellow-200 px-0.5 rounded-sm font-semibold text-neutral-800">{match}</mark>{after}</> );
};

// Main Dashboard Component
const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    
    // --- State Variables ---
    const [visits, setVisits] = useState<Visit[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);
    const [allRefs, setAllRefs] = useState<UserType[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDataReady, setIsDataReady] = useState(false);
    
    // --- Inline Editing State ---
    const [editingCell, setEditingCell] = useState<EditingCellState>({ type: null, rowId: null, field: null });
    const [editValue, setEditValue] = useState<any>('');
    const [isLoadingInline, setIsLoadingInline] = useState(false);
    const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);

    // --- Constants ---
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

    // Derived state for any add/edit operation
    const isEditingOrAdding = useMemo(() =>
        !!editingCell.rowId
    , [editingCell.rowId]);

    // --- Data Fetching ---
    useEffect(() => {
        // Initial setup
        setIsLoading(true);
        setIsDataReady(false);
        let visitsLoaded = false;
        let usersLoaded = false;
        let routesLoaded = false;
        let itemsLoaded = false;

        // Check if all data is loaded
        const checkDataReady = () => {
            if (visitsLoaded && usersLoaded && routesLoaded && itemsLoaded) {
                setIsLoading(false);
                setIsDataReady(true);
            }
        };

        // Fetch visits
        const fetchVisits = async () => {
            try {
                const { data, error } = await supabase.from('visits').select('*').order('date', { ascending: false });
                if (error) throw error;
                setVisits(data || []);
            } catch (error) {
                console.error('Error fetching visits:', error);
            } finally {
                visitsLoaded = true;
                checkDataReady();
            }
        };

        // Fetch users
        const fetchUsers = async () => {
            try {
                const { data, error } = await supabase.from('users').select('*');
                if (error) throw error;
                const fetchedUsers = data || [];
                setUsers(fetchedUsers);
                setAllRefs(fetchedUsers.filter(u => u.role === 'Ref')
                    .sort((a, b) => (a.first_name || '').localeCompare(b.first_name || '')));
            } catch (error) {
                console.error('Error fetching users:', error);
            } finally {
                usersLoaded = true;
                checkDataReady();
            }
        };

        // Fetch routes
        const fetchRoutes = async () => {
            try {
                const { data, error } = await supabase.from('routes').select('*').order('number', { ascending: true });
                if (error) throw error;
                setRoutes(data || []);
            } catch (error) {
                console.error('Error fetching routes:', error);
            } finally {
                routesLoaded = true;
                checkDataReady();
            }
        };

        // Fetch items
        const fetchItems = async () => {
            try {
                const { data, error } = await supabase.from('items').select('*').order('item_number', { ascending: true });
                if (error) throw error;
                setItems(data || []);
            } catch (error) {
                console.error('Error fetching items:', error);
            } finally {
                itemsLoaded = true;
                checkDataReady();
            }
        };

        // Execute all fetch operations
        fetchVisits();
        fetchUsers();
        fetchRoutes();
        fetchItems();
    }, []);

    // --- Stats Calculation ---
    const stats = useMemo(() => ({
        today: visits.filter(v => v.date.split('T')[0] === todayString).length,
        thisWeek: visits.filter(v => {
            const visitDateStr = v.date.split('T')[0];
            return visitDateStr >= thisWeekStart && visitDateStr <= thisWeekEnd;
        }).length,
        completed: visits.filter(v => v.status === 'Completed').length,
        total: visits.length,
        refs: allRefs.length,
        routes: routes.length,
        items: items.length
    }), [visits, allRefs.length, routes.length, items.length, todayString, thisWeekStart, thisWeekEnd]);

    // --- Utility Functions ---
    const formatDateDisplay = (d: string | null | undefined): string => {
        if (!d) return 'N/A';
        try {
            return format(parseISO(d), 'MMM d, yyyy');
        } catch(e) {
            return d.split('T')[0];
        }
    };

    const formatRelativeDate = (d: string | null | undefined): string => {
        if (!d) return 'N/A';
        try {
            return formatDistanceToNow(parseISO(d), { addSuffix: true });
        } catch(e) {
            return 'Invalid date';
        }
    };

    // --- Render ---
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>
            
            {/* Stats Section */}
            <div id="stats">
              <DashboardStats stats={stats} />
            </div>
            
            {/* Main Content Sections */}
            <div className="mt-10 space-y-10">
                {/* Visits Section */}
                <VisitsSection 
                    visits={visits}
                    setVisits={setVisits}
                    users={users}
                    allRefs={allRefs}
                    items={items}
                    editingCell={editingCell}
                    setEditingCell={setEditingCell}
                    editValue={editValue}
                    setEditValue={setEditValue}
                    isLoadingInline={isLoadingInline}
                    setIsLoadingInline={setIsLoadingInline}
                    inputRef={inputRef}
                    isEditingOrAdding={isEditingOrAdding}
                    deliveryTypes={deliveryTypes}
                    visitStatuses={visitStatuses}
                    todayString={todayString}
                    thisWeekStart={thisWeekStart}
                    thisWeekEnd={thisWeekEnd}
                    formatDateDisplay={formatDateDisplay}
                />
                
                {/* Refs Section */}
                <RefsSection 
                    allRefs={allRefs}
                    setAllRefs={setAllRefs}
                    editingCell={editingCell}
                    setEditingCell={setEditingCell}
                    editValue={editValue}
                    setEditValue={setEditValue}
                    isLoadingInline={isLoadingInline}
                    setIsLoadingInline={setIsLoadingInline}
                    inputRef={inputRef}
                    isEditingOrAdding={isEditingOrAdding}
                    formatDateDisplay={formatDateDisplay}
                    formatRelativeDate={formatRelativeDate}
                    thisMonthStart={thisMonthStart}
                    thisMonthEnd={thisMonthEnd}
                    lastMonthStart={lastMonthStart}
                    lastMonthEnd={lastMonthEnd}
                />
                
                {/* Routes Section */}
                <RoutesSection 
                    routes={routes}
                    setRoutes={setRoutes}
                    allRefs={allRefs}
                    editingCell={editingCell}
                    setEditingCell={setEditingCell}
                    editValue={editValue}
                    setEditValue={setEditValue}
                    isLoadingInline={isLoadingInline}
                    setIsLoadingInline={setIsLoadingInline}
                    inputRef={inputRef}
                    isEditingOrAdding={isEditingOrAdding}
                />
                
                {/* Items Section */}
                <ItemsSection 
                    items={items}
                    setItems={setItems}
                    editingCell={editingCell}
                    setEditingCell={setEditingCell}
                    editValue={editValue}
                    setEditValue={setEditValue}
                    isLoadingInline={isLoadingInline}
                    setIsLoadingInline={setIsLoadingInline}
                    inputRef={inputRef}
                    isEditingOrAdding={isEditingOrAdding}
                />
            </div>
        </div>
    );
};

export default AdminDashboard;