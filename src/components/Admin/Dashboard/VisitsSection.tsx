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
    
    // No longer need formatVisitId as we're using bill_number instead
    
    // Sort visits by order if available, otherwise by route name
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
            
            // Fall back to bill number comparison if order is not available
            return (a.bill_number || '').localeCompare(b.bill_number || '');
        });
    }, [visits]);
    
    // Component state
    // Define columns for the table
    const columns = [
        {
            key: 'bill_number',
            header: 'Bill Number',
            editable: true,
            filterable: true
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
            key: 'combined_numbers',
            header: 'Phone Numbers',
            editable: true,
            filterable: true,
            render: (visit: Visit) => {
                // Get all non-empty number fields
                const numbers = [
                    visit.number_one,
                    visit.number_two,
                    visit.number_three,
                    visit.number_four
                ].filter(num => num && num.trim() !== '');
                
                if (numbers.length === 0) {
                    return <span className="text-neutral-400">No numbers</span>;
                }
                
                // Display each number on a new line
                return (
                    <div className="flex flex-col gap-1">
                        {numbers.map((number, index) => (
                            <div key={index} className="text-sm">{number}</div>
                        ))}
                    </div>
                );
            },
            // Custom handler for editing the combined numbers
            customEditHandler: async (visit: Visit, value: string, supabase: any) => {
                // When editing starts, the current values are already loaded
                // Split the input by newlines or commas (to support both formats)
                const numberArray = value.split(/[,\n]/).map(num => num.trim()).filter(num => num !== '');
                
                // Assign values to the appropriate fields (up to 4 numbers)
                const updateData: any = {
                    number_one: numberArray[0] || '',
                    number_two: numberArray[1] || '',
                    number_three: numberArray[2] || '',
                    number_four: numberArray[3] || ''
                };
                
                // Update the database
                const { error } = await supabase
                    .from('visits')
                    .update(updateData)
                    .eq('id', visit.id);
                
                if (error) throw error;
                
                // Return the updated data to update the local state
                return {
                    ...visit,
                    ...updateData
                };
            }
        },

        {
            key: 'item_id',
            header: 'Items',
            editable: true,
            filterable: true,
            type: 'custom', // Use custom type for specialized editing
            render: (visit: Visit) => {
                // Get all items for this visit
                const visitItems = (visit.item_id || []) as string[];
                
                if (visitItems.length === 0) {
                    return <span className="text-neutral-400">No items</span>;
                }
                
                // Display each item number and name on a new line with remove button
                return (
                    <div className="flex flex-col gap-1">
                        {visitItems.map((itemId, index) => {
                            const item = items.find(i => i.id === itemId);
                            return (
                                <div key={index} className="flex items-center gap-1">
                                    <div className="text-sm badge badge-outline">
                                        {item ? `${item.item_number} - ${item.item_name}` : 'Unknown'}
                                    </div>
                                    {/* This button will only be shown in view mode, not edit mode */}
                                    <button 
                                        className="btn btn-xs btn-ghost text-error" 
                                        onClick={async (e) => {
                                            e.stopPropagation(); // Prevent triggering edit mode
                                            
                                            // Remove this item from the visit
                                            const updatedItemIds = visitItems.filter(id => id !== itemId);
                                            
                                            try {
                                                // Update the database
                                                const { error } = await supabase
                                                    .from('visits')
                                                    .update({ item_id: updatedItemIds })
                                                    .eq('id', visit.id);
                                                
                                                if (error) throw error;
                                                
                                                // Update local state
                                                setVisits(prev => prev.map(v => 
                                                    v.id === visit.id ? { ...v, item_id: updatedItemIds } : v
                                                ));
                                            } catch (error) {
                                                console.error('Error removing item:', error);
                                            }
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                );
            },
            // Custom handler for editing the items
            customEditHandler: async (visit: Visit, value: string, supabase: any) => {
                // Parse the selected item IDs from the multiselect value
                const selectedItemIds = value.split(',').filter(id => id.trim() !== '');
                
                // Update the database
                const { error } = await supabase
                    .from('visits')
                    .update({ item_id: selectedItemIds })
                    .eq('id', visit.id);
                
                if (error) throw error;
                
                // Return the updated data to update the local state
                return {
                    ...visit,
                    item_id: selectedItemIds
                };
            },
            // Custom editor component for item selection
            customEditor: (props: {
                value: string;
                onChange: (value: string) => void;
                onBlur: () => void;
                visit: Visit;
            }) => {
                const visitItemIds = (props.visit.item_id || []) as string[];
                const [itemNumber, setItemNumber] = useState('');
                
                // Handle adding an item by item number
                const handleAddItemByNumber = () => {
                    if (!itemNumber.trim()) return;
                    
                    // Find the item with the matching item_number
                    const foundItem = items.find(item => 
                        item.item_number.toLowerCase() === itemNumber.trim().toLowerCase()
                    );
                    
                    if (foundItem) {
                        // Only add if not already in the list
                        if (!visitItemIds.includes(foundItem.id)) {
                            const newItemIds = [...visitItemIds, foundItem.id];
                            props.onChange(newItemIds.join(','));
                        }
                        // Reset the input field
                        setItemNumber('');
                    } else {
                        // Could show an error message here
                        alert('Item number not found');
                    }
                };
                
                // Handle selection of a new item from dropdown (keeping this as a fallback)
                const handleItemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
                    const selectedItemId = e.target.value;
                    if (!selectedItemId) return;
                    
                    // Only add if not already in the list
                    if (!visitItemIds.includes(selectedItemId)) {
                        const newItemIds = [...visitItemIds, selectedItemId];
                        props.onChange(newItemIds.join(','));
                    }
                    
                    // Reset the select to the placeholder
                    e.target.value = '';
                };
                
                // Handle removing an item
                const handleRemoveItem = (itemIdToRemove: string) => {
                    const newItemIds = visitItemIds.filter(id => id !== itemIdToRemove);
                    props.onChange(newItemIds.join(','));
                };
                
                // Handle key press in the item number input
                const handleKeyPress = (e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItemByNumber();
                    }
                };
                
                return (
                    <div className="flex flex-col gap-2">
                        {/* Input to enter item number directly */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                placeholder="Enter item number..."
                                value={itemNumber}
                                onChange={(e) => setItemNumber(e.target.value)}
                                onKeyPress={handleKeyPress}
                            />
                            <button
                                className="btn btn-primary"
                                onClick={handleAddItemByNumber}
                                type="button"
                            >
                                Add
                            </button>
                        </div>
                        
                        {/* Dropdown to select items (as a fallback) */}
                        <select 
                            className="select select-bordered w-full" 
                            onChange={handleItemSelect}
                            defaultValue=""
                        >
                            <option value="" disabled>Or select an item from list...</option>
                            {items.map(item => (
                                <option 
                                    key={item.id} 
                                    value={item.id}
                                    disabled={visitItemIds.includes(item.id)}
                                >
                                    {item.item_number} - {item.item_name}
                                </option>
                            ))}
                        </select>
                        
                        {/* Display currently selected items with remove buttons */}
                        <div className="flex flex-col gap-1 mt-2">
                            {visitItemIds.length > 0 ? (
                                visitItemIds.map(itemId => {
                                    const item = items.find(i => i.id === itemId);
                                    return (
                                        <div key={itemId} className="flex items-center gap-1">
                                            <div className="text-sm badge badge-outline">
                                                {item ? `${item.item_number} - ${item.item_name}` : 'Unknown'}
                                            </div>
                                            <button 
                                                className="btn btn-xs btn-ghost text-error"
                                                onClick={() => handleRemoveItem(itemId)}
                                                type="button"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <span className="text-neutral-400">No items selected</span>
                            )}
                        </div>
                        
                        {/* Hidden input to store the actual value */}
                        <input 
                            type="hidden" 
                            value={visitItemIds.join(',')} 
                            onBlur={props.onBlur}
                        />
                    </div>
                );
            },
            // When editing starts, prepare the value for the custom editor
            getEditValue: (visit: Visit) => {
                const visitItems = (visit.item_id || []) as string[];
                return visitItems.join(',');
            }
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
            order: highestOrder + 1, // Set order to be highest + 1
            item_id: [] // Initialize with empty array of items
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
                    items={sortedVisits.map(visit => visit.id)} // Still using ID for unique identification in drag-drop
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