import React, { useState } from 'react';
import { User } from '../../../types';
import { EditingCellState, NewRefDataType } from '../types';
import { HighlightMatch } from './index';
import TableSection from './TableSection';
import { supabase } from '../../../supabaseClient';

interface RefsSectionProps {
    allRefs: User[];
    setAllRefs: React.Dispatch<React.SetStateAction<User[]>>;
    editingCell: EditingCellState;
    setEditingCell: React.Dispatch<React.SetStateAction<EditingCellState>>;
    editValue: any;
    setEditValue: React.Dispatch<React.SetStateAction<any>>;
    isLoadingInline: boolean;
    setIsLoadingInline: React.Dispatch<React.SetStateAction<boolean>>;
    inputRef: React.RefObject<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
    isEditingOrAdding: boolean;
    formatDateDisplay: (d: string | null | undefined) => string;
    formatRelativeDate: (d: string | null | undefined) => string;
    thisMonthStart: string;
    thisMonthEnd: string;
    lastMonthStart: string;
    lastMonthEnd: string;
}

const RefsSection: React.FC<RefsSectionProps> = ({
    allRefs,
    setAllRefs,
    editingCell,
    setEditingCell,
    editValue,
    setEditValue,
    isLoadingInline,
    setIsLoadingInline,
    inputRef,
    isEditingOrAdding,
    formatDateDisplay,
    formatRelativeDate,
    thisMonthStart,
    thisMonthEnd,
    lastMonthStart,
    lastMonthEnd
}) => {
    // State for global access toggle
    const [isUpdatingAllAccess, setIsUpdatingAllAccess] = useState(false);
    
    // Check if all refs have access enabled
    const allRefsHaveAccess = allRefs.every(ref => ref.access === true);
    
    // Handle toggling access for a single user
    const handleToggleAccess = async (userId: string, currentAccess: boolean | undefined) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ access: !currentAccess })
                .eq('id', userId);
                
            if (error) throw error;
            
            // Update local state
            setAllRefs(prev => prev.map(ref => 
                ref.id === userId ? { ...ref, access: !currentAccess } : ref
            ));
        } catch (error) {
            console.error('Error updating access:', error);
        }
    };
    
    // Handle toggling access for all referrers
    const handleToggleAllAccess = async () => {
        setIsUpdatingAllAccess(true);
        try {
            const newAccessValue = !allRefsHaveAccess;
            
            // Update all refs with role = 'Ref' in the database
            const { error } = await supabase
                .from('users')
                .update({ access: newAccessValue })
                .eq('role', 'Ref');
                
            if (error) throw error;
            
            // Update local state
            setAllRefs(prev => prev.map(ref => 
                ref.role === 'Ref' ? { ...ref, access: newAccessValue } : ref
            ));
        } catch (error) {
            console.error('Error updating all access:', error);
        } finally {
            setIsUpdatingAllAccess(false);
        }
    };
    
    // Define columns for the table
    const columns = [
        {
            key: 'first_name',
            header: 'First Name',
            editable: true,
            filterable: true
        },
        {
            key: 'last_name',
            header: 'Last Name',
            editable: true,
            filterable: true
        },
        {
            key: 'email',
            header: 'Email',
            editable: true,
            filterable: true
        },
        {
            key: 'phone',
            header: 'Phone',
            editable: true,
            filterable: true
        },
        {
            key: 'access',
            header: 'Access',
            editable: false,
            filterable: true,
            render: (ref: User) => (
                <div className="flex justify-center">
                    <input 
                        type="checkbox" 
                        checked={ref.access === true}
                        onChange={() => handleToggleAccess(ref.id, ref.access)}
                        className="toggle toggle-primary"
                    />
                </div>
            )
        },
        {
            key: 'created_at',
            header: 'Joined',
            editable: false,
            filterable: true,
            render: (ref: User) => (
                <span title={formatDateDisplay(ref.created_at)}>
                    {formatRelativeDate(ref.created_at)}
                </span>
            )
        }
    ];

    // Define filters
    const filters = [
        {
            key: 'this-month',
            label: 'This Month',
            filter: (ref: User) => {
                const createdAt = ref.created_at?.split('T')[0];
                return createdAt ? (createdAt >= thisMonthStart && createdAt <= thisMonthEnd) : false;
            }
        },
        {
            key: 'last-month',
            label: 'Last Month',
            filter: (ref: User) => {
                const createdAt = ref.created_at?.split('T')[0];
                return createdAt ? (createdAt >= lastMonthStart && createdAt <= lastMonthEnd) : false;
            }
        }
    ];

    // Handle adding a new ref
    const handleAddRef = async () => {
        const newRef: NewRefDataType = {
            first_name: 'New',
            last_name: 'Referrer',
            email: 'new.referrer@example.com',
            phone: '',
            role: 'Ref',
            access: true // Default to enabled access for new referrers
        };

        try {
            const { data, error } = await supabase
                .from('users')
                .insert({...newRef, role: 'Ref'})
                .select()
                .single();

            if (error) throw error;
            if (data) {
                setAllRefs(prev => [...prev, data]);
            }
        } catch (error) {
            console.error('Error adding new referrer:', error);
        }
    };

    return (
        <>
            {/* Global Access Toggle Button */}
            <div className="flex justify-end mb-4">
                <button 
                    className={`btn ${allRefsHaveAccess ? 'btn-error' : 'btn-success'} ${isUpdatingAllAccess ? 'loading' : ''}`}
                    onClick={handleToggleAllAccess}
                    disabled={isUpdatingAllAccess}
                >
                    {allRefsHaveAccess ? 'Disable All Access' : 'Enable All Access'}
                </button>
            </div>
            
            <TableSection
                title="Referrers"
                data={allRefs}
                setData={setAllRefs}
                columns={columns}
                tableName="users"
                itemType="ref"
                searchPlaceholder="Search referrers..."
                filters={filters}
                onAddItem={handleAddRef}
                addButtonText="Add Referrer"
                editingCell={editingCell}
                setEditingCell={setEditingCell}
                editValue={editValue}
                setEditValue={setEditValue}
                isLoadingInline={isLoadingInline}
                setIsLoadingInline={setIsLoadingInline}
                inputRef={inputRef}
                dateField="created_at"
            />
        </>
    );
};

export default RefsSection;