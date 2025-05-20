import React, { useState, useMemo } from 'react';
import { User } from '../../../types';
import { Route, EditingCellState, NewRouteDataType } from '../types';
import { HighlightMatch } from './index';
import TableSection from './TableSection';
import { supabase } from '../../../supabaseClient';

interface RoutesSectionProps {
    routes: Route[];
    setRoutes: React.Dispatch<React.SetStateAction<Route[]>>;
    allRefs: User[];
    editingCell: EditingCellState;
    setEditingCell: React.Dispatch<React.SetStateAction<EditingCellState>>;
    editValue: any;
    setEditValue: React.Dispatch<React.SetStateAction<any>>;
    isLoadingInline: boolean;
    setIsLoadingInline: React.Dispatch<React.SetStateAction<boolean>>;
    inputRef: React.RefObject<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
    isEditingOrAdding: boolean;
}

const RoutesSection: React.FC<RoutesSectionProps> = ({
    routes,
    setRoutes,
    allRefs,
    editingCell,
    setEditingCell,
    editValue,
    setEditValue,
    isLoadingInline,
    setIsLoadingInline,
    inputRef,
    isEditingOrAdding
}) => {
    // State for referrer filter
    const [activeReferrerFilter, setActiveReferrerFilter] = useState<string>('all');
    // Create referrer filter buttons
    const referrerFilters = useMemo(() => {
        // Create a filter for all routes
        const allRoutesFilter = {
            key: 'all',
            label: 'All',
            filter: () => true
        };
        
        // Create a filter for unassigned routes
        const unassignedFilter = {
            key: 'unassigned',
            label: 'Unassigned',
            filter: (route: Route) => !route.ref_id
        };
        
        // Create filters for each referrer that has at least one route assigned
        const referrersWithRoutes = allRefs.filter(ref => 
            routes.some(route => route.ref_id === ref.id)
        );
        
        const referrerSpecificFilters = referrersWithRoutes.map(ref => ({
            key: `ref-${ref.id}`,
            label: ref.first_name,
            filter: (route: Route) => route.ref_id === ref.id
        }));
        
        return [allRoutesFilter, unassignedFilter, ...referrerSpecificFilters];
    }, [allRefs, routes]);
    
    // Filter routes based on selected referrer
    const filteredRoutes = useMemo(() => {
        if (activeReferrerFilter === 'all') {
            return routes;
        }
        
        const selectedFilter = referrerFilters.find(filter => filter.key === activeReferrerFilter);
        if (!selectedFilter) return routes;
        
        return routes.filter(selectedFilter.filter);
    }, [routes, activeReferrerFilter, referrerFilters]);
    
    // Handle referrer filter button click
    const handleReferrerFilterClick = (filterKey: string) => {
        setActiveReferrerFilter(prevFilter => prevFilter === filterKey ? 'all' : filterKey);
    };
    
    // Define columns for the table
    const columns = [
        {
            key: 'number',
            header: 'Number',
            editable: true,
            filterable: true,
            type: 'number'
        },
        {
            key: 'name',
            header: 'Name',
            editable: true,
            filterable: true,
            render: (route: Route) => (
                <div className="font-medium">{route.name}</div>
            )
        },
        // REMOVED DESCRIPTION COLUMN
        {
            key: 'ref_id',
            header: 'Assigned To',
            editable: true,
            filterable: true,
            type: 'select',
            options: [{ value: '', label: 'Unassigned' }, ...allRefs.map(ref => ({ value: ref.id, label: `${ref.first_name} ${ref.last_name}` }))],
            render: (route: Route) => (
                <div>
                    {route.ref_id ? (
                        <>
                            {allRefs.find(ref => ref.id === route.ref_id)?.first_name || 'Unknown'}
                            {' '}
                            {allRefs.find(ref => ref.id === route.ref_id)?.last_name || ''}
                        </>
                    ) : (
                        <span className="text-neutral-400">Unassigned</span>
                    )}
                </div>
            )
        }
    ];

    // Handle adding a new route
    const handleAddRoute = async () => {
        const newRouteNumber = Math.max(0, ...routes.map(r => r.number || 0)) + 1;
        const newRoute: NewRouteDataType = {
            name: `New Route ${newRouteNumber}`,
            number: newRouteNumber,
            ref_id: null
        };

        try {
            const { data, error } = await supabase
                .from('routes')
                .insert(newRoute)
                .select()
                .single();

            if (error) throw error;
            if (data) {
                setRoutes(prev => [...prev, data]);
            }
        } catch (error) {
            console.error('Error adding new route:', error);
        }
    };

    return (
        <div>
            {/* Referrer Filter Buttons */}
            <div className="mb-4">
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-medium text-neutral-600">Filter by Referrer:</span>
                    {referrerFilters.map(filter => (
                        <button
                            key={filter.key}
                            onClick={() => handleReferrerFilterClick(filter.key)}
                            className={`btn btn-sm ${activeReferrerFilter === filter.key ? 'btn-primary' : 'btn-outline'}`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>
            
            <TableSection
                title="Routes"
                data={filteredRoutes}
                setData={setRoutes}
                columns={columns}
                tableName="routes"
                itemType="route"
                searchPlaceholder="Search routes..."
                onAddItem={handleAddRoute}
                addButtonText="Add Route"
                editingCell={editingCell}
                setEditingCell={setEditingCell}
                editValue={editValue}
                setEditValue={setEditValue}
                isLoadingInline={isLoadingInline}
                setIsLoadingInline={setIsLoadingInline}
                inputRef={inputRef}
                dateField="created_at"
            />
        </div>
    );
};

export default RoutesSection;