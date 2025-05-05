import React from 'react';
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
        {
            key: 'description',
            header: 'Description',
            editable: true,
            filterable: true
        },
        {
            key: 'ref_id',
            header: 'Assigned To',
            editable: true,
            filterable: true,
            type: 'select',
            options: ['', ...allRefs.map(ref => ref.id)],
            render: (route: Route) => (
                <div>
                    {route.ref_id ? (
                        <>
                            {allRefs.find(ref => ref.id === route.ref_id)?.first_name || 'Unknown'} 
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
        <TableSection
            title="Routes"
            data={routes}
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
    );
};

export default RoutesSection;