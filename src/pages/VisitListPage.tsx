import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BarChart2, MapPin, Calendar, Filter, Download, User, RefreshCw, ChevronDown, ChevronUp, Check, X, Trash2 } from 'lucide-react';
import { Visit, User as UserType } from '../types';
import { supabase } from '../supabaseClient';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

const AdminDashboardPage: React.FC = () => {
  // ... existing imports and initial state declarations ...

  // New handler for changing reference
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

  // New handler for changing type
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

  // New handler for changing status
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

  // New handler for deleting visit
  const handleDeleteVisit = async (visitId: string) => {
    if (!window.confirm('Are you sure you want to delete this visit?')) return;
    
    try {
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', visitId);

      if (error) throw error;

      setVisits(visits.filter(v => v.id !== visitId));
    } catch (error) {
      console.error('Error deleting visit:', error);
      alert('Failed to delete visit.');
    }
  };

  // New handler for updating buyer details
  const handleBuyerChange = async (visitId: string, newName: string) => {
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

  // New handler for updating phone details
  const handlePhoneChange = async (visitId: string, newPhone: string) => {
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

  // In the visits table JSX, update the relevant columns:
  return (
    // ... existing code ...
    <tbody>
      {filteredVisits.map((visit) => {
        const refUser = users.find(u => u.id === visit.ref_id);
        
        return (
          <tr key={visit.id} className="border-b border-neutral-200 hover:bg-neutral-50">
            {/* Date cell remains same */}
            
            {/* Updated Buyer cell */}
            <td className="px-4 py-3">
              <input
                type="text"
                value={visit.buyer_name}
                onChange={(e) => handleBuyerChange(visit.id, e.target.value)}
                className="border rounded px-2 py-1 text-sm w-32"
              />
            </td>

            {/* Updated Phone cell */}
            <td className="px-4 py-3">
              <input
                type="text"
                value={visit.phone}
                onChange={(e) => handlePhoneChange(visit.id, e.target.value)}
                className="border rounded px-2 py-1 text-sm w-32"
              />
            </td>

            {/* Updated Type cell */}
            <td className="px-4 py-3">
              <select 
                value={visit.type}
                onChange={(e) => handleTypeChange(visit.id, e.target.value as 'Delivery' | 'Collection')}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="Delivery">Delivery</option>
                <option value="Collection">Collection</option>
              </select>
            </td>

            {/* Updated Reference cell */}
            <td className="px-4 py-3">
              <select 
                value={visit.ref_id || ''}
                onChange={(e) => handleRefChange(visit.id, e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">Select Reference</option>
                {refs.map(ref => (
                  <option key={ref.id} value={ref.id}>
                    {ref.first_name} {ref.last_name}
                  </option>
                ))}
              </select>
            </td>

            {/* Updated Status cell */}
            <td className="px-4 py-3">
              <select 
                value={visit.status}
                onChange={(e) => handleStatusChange(visit.id, e.target.value as 'Pending' | 'Completed' | 'Cancelled')}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </td>

            {/* Updated Action cell with delete button */}
            <td className="px-4 py-3 flex items-center space-x-2">
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${visit.location.lat},${visit.location.lng}`}
                className="text-accent hover:underline flex items-center"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin size={14} className="mr-1" /> Map
              </a>
              <button
                onClick={() => handleDeleteVisit(visit.id)}
                className="text-error hover:underline flex items-center"
              >
                <Trash2 size={14} className="mr-1" /> Delete
              </button>
            </td>
          </tr>
        );
      })}
    </tbody>
    // ... rest of the code ...
  );
};

export default AdminDashboardPage;