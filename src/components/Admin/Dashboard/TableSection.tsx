import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { EditingCellState } from '../types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Draggable row component for table
interface DraggableRowProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

const DraggableRow: React.FC<DraggableRowProps> = ({ id, children, className = '' }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 999 : 'auto',
    cursor: 'grab'
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${className} ${isDragging ? 'bg-base-200' : ''}`}
    >
      {children}
    </tr>
  );
};


interface TableSectionProps {
  title: string;
  data: any[];
  setData: React.Dispatch<React.SetStateAction<any[]>>;
  columns: {
    key: string;
    header: string;
    render?: (item: any) => React.ReactNode;
    editable?: boolean;
    type?: 'text' | 'number' | 'select';
    options?: (string | { value: string, label: string })[];
    filterable?: boolean; // Whether this column should have a filter option
    customEditHandler?: (item: any, value: any, supabase: any) => Promise<any>; // Custom handler for editing
  }[];
  tableName: string; // Supabase table name
  itemType: 'visit' | 'ref' | 'route' | 'item';
  searchPlaceholder?: string;
  filters?: {
    key: string;
    label: string;
    filter: (item: any) => boolean;
  }[];
  onAddItem?: (activeFilter: string) => void;
  addButtonText?: string;
  editingCell: EditingCellState;
  setEditingCell: React.Dispatch<React.SetStateAction<EditingCellState>>;
  editValue: any;
  setEditValue: React.Dispatch<React.SetStateAction<any>>;
  isLoadingInline: boolean;
  setIsLoadingInline: React.Dispatch<React.SetStateAction<boolean>>;
  inputRef: React.RefObject<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
  dateField?: string; // Field name for date filtering
  isDraggable?: boolean; // Whether rows can be dragged for reordering
}

const TableSection: React.FC<TableSectionProps> = ({
  title,
  data,
  setData,
  columns,
  tableName,
  itemType,
  searchPlaceholder = 'Search...',
  filters = [],
  onAddItem,
  addButtonText = 'Add Item',
  editingCell,
  setEditingCell,
  editValue,
  setEditValue,
  isLoadingInline,
  setIsLoadingInline,
  inputRef,
  dateField,
  isDraggable = false
}) => {
  // State for filtering and search
  const [searchTerm, setSearchTerm] = useState('');
  // Replace single activeFilter with a map of selected filters by category
  const [selectedFilters, setSelectedFilters] = useState<{
    regular: string[];
    type: string[];
    status: string[];
    route: string[];
  }>({
    regular: [],
    type: [],
    status: [],
    route: []
  });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [columnFilters, setColumnFilters] = useState<{[key: string]: string}>({});
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  
  // Helper function to determine if all filters are cleared
  const areAllFiltersCleared = () => {
    return (
      selectedFilters.regular.length === 0 &&
      selectedFilters.type.length === 0 &&
      selectedFilters.status.length === 0 &&
      selectedFilters.route.length === 0
    );
  };
  
  // Helper function to get filter category from key
  const getFilterCategory = (filterKey: string): 'regular' | 'type' | 'status' | 'route' => {
    if (filterKey.startsWith('type-')) return 'type';
    if (filterKey.startsWith('status-')) return 'status';
    if (filterKey.startsWith('route-') || filterKey === 'no-route') return 'route';
    return 'regular';
  };
  
  // Toggle a filter selection
  const toggleFilter = (filterKey: string) => {
    const category = getFilterCategory(filterKey);
    
    setSelectedFilters(prev => {
      // If this filter is already selected, remove it
      if (prev[category].includes(filterKey)) {
        return {
          ...prev,
          [category]: prev[category].filter(key => key !== filterKey)
        };
      }
      // Otherwise add it, but first remove any other filters in the same category
      // since we don't allow multiple selections within the same category
      return {
        ...prev,
        [category]: [filterKey]
      };
    });
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    setSelectedFilters({
      regular: [],
      type: [],
      status: [],
      route: []
    });
  };

  // Filter data based on search term, multiple filters, date range, and column filters
  const filteredData = React.useMemo(() => {
    if (isCollapsed) return [];
    
    return data.filter(item => {
      // Apply search filter
      const searchMatch = searchTerm === '' || 
        Object.entries(item).some(([key, value]) => {
          if (typeof value === 'string' || typeof value === 'number') {
            return String(value).toLowerCase().includes(searchTerm.toLowerCase());
          }
          return false;
        });
      
      // Apply multiple filters from different categories
      // If no filters are selected in a category, all items pass that category's filter
      let regularFilterMatch = selectedFilters.regular.length === 0 || 
        selectedFilters.regular.some(filterKey => {
          const filterObj = filters.find(f => f.key === filterKey);
          return filterObj ? filterObj.filter(item) : false;
        });
      
      let typeFilterMatch = selectedFilters.type.length === 0 || 
        selectedFilters.type.some(filterKey => {
          const filterObj = filters.find(f => f.key === filterKey);
          return filterObj ? filterObj.filter(item) : false;
        });
      
      let statusFilterMatch = selectedFilters.status.length === 0 || 
        selectedFilters.status.some(filterKey => {
          const filterObj = filters.find(f => f.key === filterKey);
          return filterObj ? filterObj.filter(item) : false;
        });
      
      let routeFilterMatch = selectedFilters.route.length === 0 || 
        selectedFilters.route.some(filterKey => {
          const filterObj = filters.find(f => f.key === filterKey);
          return filterObj ? filterObj.filter(item) : false;
        });
      
      // Combine all filter categories - an item must pass ALL categories to be included
      const filterMatch = regularFilterMatch && typeFilterMatch && statusFilterMatch && routeFilterMatch;
      
      // Apply date filter if dateField is provided
      let dateMatch = true;
      if (dateField && (startDate || endDate)) {
        const itemDate = item[dateField]?.split('T')[0];
        if (itemDate) {
          if (startDate && endDate) {
            dateMatch = itemDate >= startDate && itemDate <= endDate;
          } else if (startDate) {
            dateMatch = itemDate >= startDate;
          } else if (endDate) {
            dateMatch = itemDate <= endDate;
          }
        }
      }
      
      // Apply column filters
      let columnFilterMatch = true;
      if (Object.keys(columnFilters).length > 0) {
        columnFilterMatch = Object.entries(columnFilters).every(([key, value]) => {
          if (!value) return true; // Skip empty filters
          
          const itemValue = item[key];
          if (itemValue === null || itemValue === undefined) return false;
          
          // Get column definition to check if it's a select type
          const columnDef = columns.find(col => col.key === key);
          const isSelectType = columnDef?.type === 'select';
          
          // Handle different types of values
          if (typeof itemValue === 'string') {
            // For select types, do exact match; for others, do partial match
            return isSelectType 
              ? itemValue === value
              : itemValue.toLowerCase().includes(value.toLowerCase());
          } else if (typeof itemValue === 'number') {
            return isSelectType
              ? String(itemValue) === value
              : String(itemValue).includes(value);
          } else if (typeof itemValue === 'object') {
            // For objects like dates or nested objects, try to match in string representation
            return JSON.stringify(itemValue).toLowerCase().includes(value.toLowerCase());
          }
          
          return false;
        });
      }
      
      return searchMatch && filterMatch && dateMatch && columnFilterMatch;
    });
  }, [data, searchTerm, selectedFilters, filters, isCollapsed, startDate, endDate, dateField, columnFilters]);
  
  // Get unique values for each filterable column
  const getUniqueColumnValues = (columnKey: string) => {
    const uniqueValues = new Set<string>();
    
    data.forEach(item => {
      const value = item[columnKey];
      if (value !== null && value !== undefined) {
        uniqueValues.add(String(value));
      }
    });
    
    return Array.from(uniqueValues).sort();
  };
  
  // Get column by key
  const getColumnByKey = (key: string) => {
    return columns.find(col => col.key === key);
  };

  // Handle cell double click for inline editing
  const handleCellDoubleClick = (rowId: string, field: string) => {
    const item = data.find(i => i.id === rowId);
    if (!item) return;
    
    setEditingCell({ type: itemType, rowId, field: field as any });
    
    // Special handling for phone numbers field
    if (field === 'combined_numbers' && itemType === 'visit') {
      // Format phone numbers as multi-line text
      const numbers = [
        item.number_one,
        item.number_two,
        item.number_three,
        item.number_four
      ].filter(num => num && num.trim() !== '').join('\n');
      
      setEditValue(numbers);
    } else {
      setEditValue(item[field]);
    }
    
    // Focus the input after it's rendered
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 10);
  };

  // Handle saving edited cell value
  const handleSaveEdit = async () => {
    if (!editingCell.rowId || !editingCell.field) return;
    
    setIsLoadingInline(true);
    
    try {
      // Get the item being edited
      const itemToUpdate = data.find(item => item.id === editingCell.rowId);
      if (!itemToUpdate) throw new Error('Item not found');
      
      // Get the column definition
      const columnDef = columns.find(col => col.key === editingCell.field);
      if (!columnDef) throw new Error('Column not found');
      
      // Check if this column has a custom edit handler
      if (columnDef.customEditHandler) {
        // Use the custom handler
        const updatedItem = await columnDef.customEditHandler(itemToUpdate, editValue, supabase);
        
        // Update local state with the result from the custom handler
        setData(prevData => 
          prevData.map(item => 
            item.id === editingCell.rowId ? updatedItem : item
          )
        );
        return; // Exit early as we've handled the update
      }
      
      // Special handling for route_id changes in visits table
      if (tableName === 'visits' && editingCell.field === 'route_id') {
        const visitToUpdate = itemToUpdate;
        // If changing route_id
        if (visitToUpdate.route_id !== editValue) {
          // If assigning to a route (not removing from a route)
          if (editValue) {
            // Find the highest order in the target route
            const visitsInTargetRoute = data.filter(v => v.route_id === editValue);
            const highestOrder = visitsInTargetRoute.length > 0 
              ? Math.max(...visitsInTargetRoute.map(v => v.order || 0)) 
              : 0;
            
            // Set the order to be highest + 1
            const newOrder = highestOrder + 1;
            
            // Update both route_id and order in Supabase
            const { error } = await supabase
              .from('visits')
              .update({ route_id: editValue, order: newOrder })
              .eq('id', editingCell.rowId);
            
            if (error) throw error;
            
            // Update local state
            setData(prevData => 
              prevData.map(item => 
                item.id === editingCell.rowId 
                  ? { ...item, route_id: editValue, order: newOrder } 
                  : item
              )
            );
          } else {
            // If removing from a route, set order to null
            const { error } = await supabase
              .from('visits')
              .update({ route_id: null, order: null })
              .eq('id', editingCell.rowId);
            
            if (error) throw error;
            
            // Update local state
            setData(prevData => 
              prevData.map(item => 
                item.id === editingCell.rowId 
                  ? { ...item, route_id: null, order: null } 
                  : item
              )
            );
          }
          return; // Exit early as we've handled the update
        }
      }
      
      // Standard update for other fields
      const { error } = await supabase
        .from(tableName)
        .update({ [editingCell.field]: editValue })
        .eq('id', editingCell.rowId);
      
      if (error) throw error;
      
      // Update local state
      setData(prevData => 
        prevData.map(item => 
          item.id === editingCell.rowId 
            ? { ...item, [editingCell.field!]: editValue } 
            : item
        )
      );
    } catch (error) {
      console.error(`Error updating ${itemType}:`, error);
    } finally {
      setIsLoadingInline(false);
      setEditingCell({ type: null, rowId: null, field: null });
      setEditValue('');
    }
  };

  // Handle cancel editing
  const handleCancelEdit = () => {
    setEditingCell({ type: null, rowId: null, field: null });
    setEditValue('');
  };

  // Handle key press in edit input
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Handle delete item
  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update local state
      setData(prevData => prevData.filter(item => item.id !== id));
    } catch (error) {
      console.error(`Error deleting ${itemType}:`, error);
    }
  };

  // Render edit input based on column type
  const renderEditInput = (column: typeof columns[0]) => {
    const type = column.type || 'text';
    
    // Special handling for phone numbers field
    if (column.key === 'combined_numbers') {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          className="textarea textarea-bordered w-full"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            // Allow Enter key for new lines in textarea
            if (e.key === 'Enter' && !e.shiftKey) {
              e.stopPropagation(); // Prevent form submission
            } else if (e.key === 'Escape') {
              handleCancelEdit();
            }
          }}
          onBlur={handleSaveEdit}
          placeholder="Enter phone numbers (one per line)"
          rows={4}
        />
      );
    }
    
    switch (type) {
      case 'select':
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            className="input input-bordered input-sm w-full"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={handleSaveEdit}
          >
            {column.options?.map(option => {
              // Handle both string options and {value, label} format
              if (typeof option === 'string') {
                return <option key={option} value={option}>{option}</option>;
              } else if (typeof option === 'object' && option !== null) {
                return <option key={option.value} value={option.value}>{option.label}</option>;
              }
              return null;
            })}
          </select>
        );
      case 'number':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="number"
            className="input input-bordered input-sm w-full"
            value={editValue}
            onChange={(e) => setEditValue(e.target.valueAsNumber)}
            onKeyDown={handleEditKeyDown}
            onBlur={handleSaveEdit}
          />
        );
      default:
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            className="input input-bordered input-sm w-full"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={handleSaveEdit}
          />
        );
    }
  };

  // Render cell content
  const renderCell = (item: any, column: typeof columns[0]) => {
    const isEditing = 
      editingCell.type === itemType && 
      editingCell.rowId === item.id && 
      editingCell.field === column.key;
    
    if (isEditing) {
      return isLoadingInline ? (
        <div className="flex justify-center items-center">
          <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
        </div>
      ) : renderEditInput(column);
    }
    
    if (column.render) {
      return column.render(item);
    }
    
    return item[column.key];
  };

  return (
    <section id={itemType + 's'} className="bg-white rounded-lg shadow-md p-6 border border-gray-200 w-full max-w-full overflow-x-auto mx-auto">
      {/* Header with collapse toggle */}
      <div className="flex justify-between items-center mb-4">
        <h2 
          className="text-2xl font-bold text-neutral-800 flex items-center cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <span className="mr-2">{isCollapsed ? '▶' : '▼'}</span>
          {title}
        </h2>
        
        {!isCollapsed && onAddItem && (
          <button 
            className="btn btn-primary"
            onClick={() => {
              // Pass the first selected filter from any category, or 'all' if none selected
              const firstSelectedFilter = 
                selectedFilters.regular[0] || 
                selectedFilters.type[0] || 
                selectedFilters.status[0] || 
                selectedFilters.route[0] || 
                'all';
              onAddItem(firstSelectedFilter);
            }}
          >
            {addButtonText}
          </button>
        )}
      </div>
      
      {!isCollapsed && (
        <>
          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
            <div className="flex flex-col gap-4 w-full">
              <div className="flex flex-col gap-2">
                {filters.length > 0 && (
                  <>
                    {/* Clear all filters button */}
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Filters</span>
                      {!areAllFiltersCleared() && (
                        <button 
                          className="btn btn-ghost btn-xs"
                          onClick={clearAllFilters}
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    
                    {/* Regular filters */}
                    <div className="flex flex-wrap gap-2">
                      {filters.filter(filter => 
                        !filter.key.startsWith('route-') && 
                        filter.key !== 'no-route' && 
                        !filter.key.startsWith('type-') && 
                        !filter.key.startsWith('status-')
                      ).map(filter => (
                        <button 
                          key={filter.key}
                          className={`btn ${selectedFilters.regular.includes(filter.key) ? 'btn-primary' : 'btn-outline'} btn-sm`}
                          onClick={() => toggleFilter(filter.key)}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                    
                    {/* Type filters on a new line */}
                    {filters.some(filter => filter.key.startsWith('type-')) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="w-full text-xs font-medium text-neutral-500">Type:</span>
                        {filters.filter(filter => filter.key.startsWith('type-')).map(filter => (
                          <button 
                            key={filter.key}
                            className={`btn ${selectedFilters.type.includes(filter.key) ? 'btn-primary' : 'btn-outline'} px-2 py-1 text-xs gap-1`}
                            onClick={() => toggleFilter(filter.key)}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Status filters on a new line */}
                    {filters.some(filter => filter.key.startsWith('status-')) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="w-full text-xs font-medium text-neutral-500">Status:</span>
                        {filters.filter(filter => filter.key.startsWith('status-')).map(filter => (
                          <button 
                            key={filter.key}
                            className={`btn ${selectedFilters.status.includes(filter.key) ? 'btn-primary' : 'btn-outline'} px-2 py-1 text-xs gap-1`}
                            onClick={() => toggleFilter(filter.key)}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Route filters on a new line */}
                    {filters.some(filter => filter.key.startsWith('route-') || filter.key === 'no-route') && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="w-full text-xs font-medium text-neutral-500">Route:</span>
                        {filters.filter(filter => filter.key.startsWith('route-') || filter.key === 'no-route').map(filter => (
                          <button 
                            key={filter.key}
                            className={`btn ${selectedFilters.route.includes(filter.key) ? 'btn-error' : 'btn-outline'} px-2 py-1 text-xs gap-1`}
                            onClick={() => toggleFilter(filter.key)}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
                
                <div className="flex gap-2 ml-auto">
                  {/* Column filters button */}
                  <button 
                    className={`btn ${showColumnFilters ? 'btn-primary' : 'btn-outline'} btn-sm`}
                    onClick={() => setShowColumnFilters(!showColumnFilters)}
                  >
                    {showColumnFilters ? 'Hide Filters' : 'Column Filters'}
                  </button>
                  
                  {/* Date filter button */}
                  {dateField && (
                    <button 
                      className={`btn ${showDateFilter ? 'btn-primary' : 'btn-outline'} btn-sm`}
                      onClick={() => setShowDateFilter(!showDateFilter)}
                    >
                      {showDateFilter ? 'Hide Date Filter' : 'Date Filter'}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 items-center">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    className="input input-bordered w-full max-w-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {/* Date filter UI */}
                {dateField && showDateFilter && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Start:</label>
                      <input
                        type="date"
                        className="input input-bordered input-sm"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">End:</label>
                      <input
                        type="date"
                        className="input input-bordered input-sm"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                    {(startDate || endDate) && (
                      <button 
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                          setStartDate('');
                          setEndDate('');
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
                
                {/* Column filters UI */}
                {showColumnFilters && (
                  <div className="flex flex-wrap gap-2 items-center w-full mt-2 p-2 bg-gray-50 rounded-md">
                    <div className="text-sm font-medium mr-2">Filter by:</div>
                    {columns.filter(col => col.filterable !== false).map(column => {
                      const columnDef = getColumnByKey(column.key);
                      const isSelectType = columnDef?.type === 'select' && columnDef?.options;
                      
                      // Get unique values for this column if not a select type
                      const uniqueValues = !isSelectType ? getUniqueColumnValues(column.key) : [];
                      
                      return (
                        <div key={column.key} className="flex items-center gap-1">
                          <label className="text-sm font-medium">{column.header}:</label>
                          {isSelectType ? (
                            <select
                              className="select select-bordered select-sm max-w-[150px]"
                              value={columnFilters[column.key] || ''}
                              onChange={(e) => {
                                setColumnFilters(prev => ({
                                  ...prev,
                                  [column.key]: e.target.value
                                }));
                              }}
                            >
                              <option value="">All</option>
                              {columnDef.options?.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          ) : uniqueValues.length > 0 ? (
                            <select
                              className="select select-bordered select-sm max-w-[150px]"
                              value={columnFilters[column.key] || ''}
                              onChange={(e) => {
                                setColumnFilters(prev => ({
                                  ...prev,
                                  [column.key]: e.target.value
                                }));
                              }}
                            >
                              <option value="">All</option>
                              {uniqueValues.map(value => (
                                <option key={value} value={value}>{value}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              className="input input-bordered input-sm max-w-[150px]"
                              value={columnFilters[column.key] || ''}
                              onChange={(e) => {
                                setColumnFilters(prev => ({
                                  ...prev,
                                  [column.key]: e.target.value
                                }));
                              }}
                              placeholder={`Filter ${column.header}`}
                            />
                          )}
                        </div>
                      );
                    })}
                    {Object.keys(columnFilters).length > 0 && (
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => setColumnFilters({})}
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Table */}
          <div className="overflow-x-auto w-full">
            <table className="table w-full min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {columns.map(column => (
                    <th key={column.key} className="px-4 py-2 text-left text-gray-600 font-medium text-sm">
                      {column.header}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-left text-gray-600 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map(item => {
                    const RowComponent = isDraggable ? DraggableRow : 'tr';
                    return (
                      <RowComponent 
                        key={item.id} 
                        id={item.id}
                        className="hover:bg-gray-50 border-b border-gray-200"
                      >
                        {columns.map(column => (
                          <td 
                            key={`${item.id}-${column.key}`} 
                            className="px-4 py-2"
                            onDoubleClick={() => column.editable && handleCellDoubleClick(item.id, column.key)}
                          >
                            {renderCell(item, column)}
                          </td>
                        ))}
                        <td className="px-4 py-2">
                          <button 
                            className="btn btn-sm btn-error btn-outline"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </RowComponent>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={columns.length + 1} className="text-center py-4">
                      {isCollapsed ? '' : 'No items found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};

export default TableSection;