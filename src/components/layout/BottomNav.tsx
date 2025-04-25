import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, ClipboardList, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const BottomNav: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-neutral-200 z-10">
      <div className="flex justify-around">
        <Link
          to="/dashboard"
          className={`flex flex-col items-center py-2 px-3 text-xs ${
            isActive('/dashboard') 
              ? 'text-accent' 
              : 'text-neutral-600'
          }`}
        >
          <LayoutDashboard size={20} />
          <span className="mt-1">Home</span>
        </Link>
        
        <Link
          to="/visits"
          className={`flex flex-col items-center py-2 px-3 text-xs ${
            isActive('/visits') 
              ? 'text-accent' 
              : 'text-neutral-600'
          }`}
        >
          <ClipboardList size={20} />
          <span className="mt-1">Visits</span>
        </Link>
        
        <Link
          to="/map"
          className={`flex flex-col items-center py-2 px-3 text-xs ${
            isActive('/map') 
              ? 'text-accent' 
              : 'text-neutral-600'
          }`}
        >
          <Map size={20} />
          <span className="mt-1">Map</span>
        </Link>
        
        {user?.role === 'Admin' && (
          <Link
            to="/admin"
            className={`flex flex-col items-center py-2 px-3 text-xs ${
              isActive('/admin') 
                ? 'text-accent' 
                : 'text-neutral-600'
            }`}
          >
            <Settings size={20} />
            <span className="mt-1">Admin</span>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default BottomNav;
