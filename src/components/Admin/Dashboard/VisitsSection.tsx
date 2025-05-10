import React, { useState, useEffect, useMemo } from 'react';
import { Visit, User } from '../../../types';
import { Item, EditingCellState, NewVisitDataType, Route } from '../types';
import { HighlightMatch } from './index';
import TableSection from './TableSection';
import { supabase } from '../../../supabaseClient';
import { Map } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface VisitsSectionProps {
    visits: Visit[];
    setVisits: React.Dispatch<React.SetStateAction<Visit[]>>;
    users: User[];
    allRefs: User[];
    items: Item[];
    editingCell: EditingCellState;
    setEditingCell: React.Dispatch<React.SetStateAction<EditingCellState>>;
    editValue: any;
    setEditValue: React.Dispatch<React.SetStateAction<any>>;
    isLoadingInline: boolean;
    setIsLoadingInline: React.Dispatch<React.SetStateAction<boolean>>;
    inputRef: React.RefObject<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
    isEditingOrAdding: boolean;
    deliveryTypes: Visit['type'][];
    visitStatuses: Visit['status'][];
    todayString: string;
    thisWeekStart: string;
    thisWeekEnd: string;
    formatDateDisplay: (d: string | null | undefined) => string;
}

const VisitsSection: React.FC<VisitsSectionProps> = ({
    visits,
    setVisits,
    users,
    allRefs,
    items,
    editingCell,
    setEditingCell,
    editValue,
    setEditValue,
    isLoadingInline,
    setIsLoadingInline,
    inputRef,
    isEditingOrAdding,
    deliveryTypes,
    visitStatuses,
    todayString,
    thisWeekStart,
    thisWeekEnd,
    formatDateDisplay
}) => {
    // State for routes data
    const [routesData, setRoutesData] = useState<Route[]>([]);
    
    // Fetch routes data for ID formatting
    useEffect(() => {
        const fetchRoutes = async () => {
            try {
                const { data, error } = await supabase
                    .from('routes')
                    .select('*');
                
                if (error) throw error;
                if (data) setRoutesData(data);
            } catch (error) {
                console.error('Error fetching routes:', error);
            }
        };
        
        fetchRoutes();
    }, []);
    
    // Format ID for display
    const formatVisitId = (visit: Visit) => {
        // If order or route_id is missing, use a portion of the UUID
        if (!visit.route_id || typeof visit.order === 'undefined' || visit.order === null) {
            return visit.id.substring(0, 8);
        }
        
        const route = routesData.find(r => r.id === visit.route_id);
        const routeName = route?.name || 'Unknown';
        const routeNumber = route?.number || 0;
        
        return `${visit.order} ${routeName} ${routeNumber}`;
    };
    
    // Sort visits by order if available, otherwise by formatted ID
    const sortedVisits = useMemo(() => {
        return [...visits].sort((a, b) => {
            // First sort by route_id
            if (a.route_id !== b.route_id) {
                if (!a.route_id) return 1;
                if (!b.route_id) return -1;
                return a.route_id.localeCompare(b.route_id);
            }
            
            // Then sort by order if both have order values
            if (typeof a.order === 'number' && typeof b.order === 'number') {
                return a.order - b.order;
            }
            
            // Fall back to ID comparison if order is not available
            const aId = formatVisitId(a);
            const bId = formatVisitId(b);
            return aId.localeCompare(bId);
        });
    }, [visits, routesData]);
    
    // Component state
    // Define columns for the table
    const columns = [
        {
            key: 'id',
            header: 'ID',
            editable: false,
            filterable: true,
            render: (visit: Visit) => formatVisitId(visit)
        },
        {
            key: 'date',
            header: 'Date',
            editable: true,
            filterable: true,
            render: (visit: Visit) => formatDateDisplay(visit.date)
        },
        {
            key: 'route_id',
            header: 'Route',
            editable: true,
            filterable: true,
            type: 'select',
            options: ['', ...routesData.map(route => ({ 
                value: route.id, 
                label: `${route.name || 'Unknown'} ${route.number || ''}`.trim() 
            }))],
            render: (visit: Visit) => (
                <div>
                    {visit.route_id ? (
                        <>
                            {routesData.find(route => route.id === visit.route_id)?.name || 'Unknown'} 
                            {routesData.find(route => route.id === visit.route_id)?.number || ''}
                        </>
                    ) : (
                        <span className="text-neutral-400">No Route</span>
                    )}
                </div>
            )
        },
        {
            key: 'ref_id',
            header: 'Ref',
            editable: true,
            filterable: true,
            type: 'select',
            options: ['', ...allRefs.map(ref => ({
                value: ref.id,
                label: `${ref.first_name || 'Unknown'} ${ref.last_name || ''}`.trim()
            }))],
            render: (visit: Visit) => (
                <div>
                    {visit.ref_id ? (
                        <>
                            {allRefs.find(ref => ref.id === visit.ref_id)?.first_name || 'Unknown'} 
                            {allRefs.find(ref => ref.id === visit.ref_id)?.last_name || ''}
                        </>
                    ) : (
                        <span className="text-neutral-400">Unassigned</span>
                    )}
                </div>
            )
        },
        {
            key: 'type',
            header: 'Type',
            editable: true,
            filterable: true,
            type: 'select',
            options: deliveryTypes,
            render: (visit: Visit) => (
                <span className={`badge ${visit.type === 'Sample' ? 'badge-primary' : visit.type === 'Sittu' ? 'badge-secondary' : 'badge-accent'}`}>
                    {visit.type}
                </span>
            )
        },
        {
            key: 'status',
            header: 'Status',
            editable: true,
            filterable: true,
            type: 'select',
            options: visitStatuses,
            render: (visit: Visit) => (
                <span className={`badge ${visit.status === 'Completed' ? 'badge-success' : visit.status === 'Pending' ? 'badge-warning' : 'badge-error'}`}>
                    {visit.status}
                </span>
            )
        },
        {
            key: 'buyer_name',
            header: 'Buyer',
            editable: true,
            filterable: true
        },
        {
            key: 'number_one',
            header: 'Number 1',
            editable: true,
            filterable: true
        },
        {
            key: 'number_two',
            header: 'Number 2',
            editable: true,
            filterable: true
        },
        {
            key: 'number_three',
            header: 'Number 3',
            editable: true,
            filterable: true
        },
        {
            key: 'number_four',
            header: 'Number 4',
            editable: true,
            filterable: true
        },
        {
            key: 'bill_number',
            header: 'Bill Number',
            editable: true,
            filterable: true
        },
        {
            key: 'notes',
            header: 'Notes',
            editable: true,
            filterable: true
        },
        {
            key: 'navigation',
            header: 'Navigation',
            editable: false,
            filterable: false,
            render: (visit: Visit) => {
                // Check if location data exists and is valid
                const hasValidLocation = visit.location && 
                    typeof visit.location.lat === 'number' && 
                    typeof visit.location.lng === 'number' && 
                    (visit.location.lat !== 0 || visit.location.lng !== 0);
                
                if (!hasValidLocation) {
                    return <span className="text-neutral-400">No location</span>;
                }
                
                // Create Google Maps URL
                const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${visit.location.lat},${visit.location.lng}`;
                
                return (
                    <a 
                        href={googleMapsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-primary text-white"
                        title="Open in Google Maps"
                    >
                        <Map size={18} />
                    </a>
                );
            }
        }
    ];

    // Define filters
    const filters = [
        {
            key: 'today',
            label: 'Today',
            filter: (visit: Visit) => visit.date.split('T')[0] === todayString
        },
        {
            key: 'all-days',
            label: 'All Days',
            filter: () => true
        }
    ];
    
    // Add route filters based on available routes
    const routeFilters = useMemo(() => {
        // Create a filter for visits with no route assigned
        const noRouteFilter = {
            key: 'no-route',
            label: 'No Route',
            filter: (visit: Visit) => !visit.route_id
        };
        
        // Create filters for each route
        const routeSpecificFilters = routesData.map(route => ({
            key: `route-${route.id}`,
            label: `${route.name} ${route.number}`,
            filter: (visit: Visit) => visit.route_id === route.id
        }));
        
        return [noRouteFilter, ...routeSpecificFilters];
    }, [routesData]);
    
    // Combine all filters
    const allFilters = [...filters, ...routeFilters];

    // Handle adding a new visit
    const handleAddVisit = async () => {
        // Check if we have any routes available
        if (routesData.length === 0) {
            console.error('Cannot add visit: No routes available');
            return;
        }
        
        // Get the first route as default
        const defaultRouteId = routesData[0].id;
        
        // Find the highest order in the default route
        const visitsInDefaultRoute = visits.filter(v => v.route_id === defaultRouteId);
        const highestOrder = visitsInDefaultRoute.length > 0 
            ? Math.max(...visitsInDefaultRoute.map(v => v.order || 0)) 
            : 0;
        
        // Create a basic new visit with default values
        const newVisit: NewVisitDataType = {
            buyer_name: 'New Visit',
            date: new Date().toISOString(),
            type: 'Sample',
            status: 'Pending',
            ref_id: allRefs.length > 0 ? allRefs[0].id : null,
            address: '',
            location: { lat: 0, lng: 0 },
            number_one: '',
            number_two: '',
            number_three: '',
            number_four: '',
            route_id: defaultRouteId, // Use the first route as default
            order: highestOrder + 1 // Set order to be highest + 1
        };

        try {
            const { data, error } = await supabase
                .from('visits')
                .insert(newVisit)
                .select()
                .single();

            if (error) throw error;
            if (data) {
                setVisits(prev => [data, ...prev]);
            }
        } catch (error) {
            console.error('Error adding new visit:', error);
        }
    };
    
    // Handle drag end event for reordering visits
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        
        if (!over || active.id === over.id) {
            return;
        }
        
        // Find the dragged visit and the target visit
        const draggedVisit = visits.find(visit => visit.id === active.id);
        const targetVisit = visits.find(visit => visit.id === over.id);
        
        if (!draggedVisit || !targetVisit) {
            return;
        }
        
        // Only allow reordering within the same route
        if (draggedVisit.route_id !== targetVisit.route_id) {
            return;
        }
        
        // Update the local state first for immediate UI feedback
        const oldIndex = sortedVisits.findIndex(visit => visit.id === active.id);
        const newIndex = sortedVisits.findIndex(visit => visit.id === over.id);
        
        const newVisits = arrayMove(sortedVisits, oldIndex, newIndex);
        
        // Get only the visits that belong to the same route as the dragged visit
        const routeVisits = newVisits.filter(visit => visit.route_id === draggedVisit.route_id);
        
        // Assign new order values (1-based) while preserving the original order values
        // This ensures we only update the order field in the database when necessary
        const updatedVisits = routeVisits.map((visit, index) => {
            const newOrder = index + 1;
            // Only update the order if it's different from the current order
            return visit.order !== newOrder ? {
                ...visit,
                order: newOrder
            } : visit;
        });
        
        // Update the local state
        setVisits(prev => {
            const otherVisits = prev.filter(visit => visit.route_id !== draggedVisit.route_id);
            return [...otherVisits, ...updatedVisits];
        });
        
        // Update the database - only update visits whose order has changed
        try {
            // Create an array of updates for visits whose order has changed
            const visitsToUpdate = updatedVisits.filter(visit => {
                const originalVisit = visits.find(v => v.id === visit.id);
                return originalVisit && originalVisit.order !== visit.order;
            });
            
            if (visitsToUpdate.length === 0) {
                return; // No order changes needed
            }
            
            // Batch update all changed visits
            for (const visit of visitsToUpdate) {
                const { error } = await supabase
                    .from('visits')
                    .update({ order: visit.order })
                    .eq('id', visit.id);
                
                if (error) {
                    console.error(`Error updating visit order for ID ${visit.id}:`, error);
                }
            }
            
            console.log(`Updated order for ${visitsToUpdate.length} visits`);
        } catch (error) {
            console.error('Error updating visit orders:', error);
        }
    };



    // Set up DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Minimum drag distance before activation
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    
    return (
        <>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext 
                    items={sortedVisits.map(visit => visit.id)}
                    strategy={horizontalListSortingStrategy}
                >
                    <TableSection
                        title="Visits"
                        data={sortedVisits}
                        setData={setVisits}
                        columns={columns}
                        tableName="visits"
                        itemType="visit"
                        searchPlaceholder="Search visits..."
                        filters={allFilters}
                        onAddItem={handleAddVisit}
                        addButtonText="Add Visit"
                        editingCell={editingCell}
                        setEditingCell={setEditingCell}
                        editValue={editValue}
                        setEditValue={setEditValue}
                        isLoadingInline={isLoadingInline}
                        setIsLoadingInline={setIsLoadingInline}
                        inputRef={inputRef}
                        dateField="date"
                        isDraggable={true}
                    />
                </SortableContext>
            </DndContext>
        </>
    );
};

export default VisitsSection;