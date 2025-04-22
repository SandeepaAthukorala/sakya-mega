import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import { useAuth } from '../../contexts/AuthContext';

const Layout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Don't show navbar on login/register pages
  const showNav = isAuthenticated && 
    !location.pathname.includes('/login') && 
    !location.pathname.includes('/register');

  return (
    <div className="min-h-screen flex flex-col bg-secondary">
      {showNav && <Navbar />}
      
      <main className="flex-1 pt-16 pb-16 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
      
      {showNav && <BottomNav />}
    </div>
  );
};

export default Layout;
