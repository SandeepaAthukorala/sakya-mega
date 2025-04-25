import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, X, User, LogOut } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center">
              <span className="text-xl font-bold text-accent">Sakya</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-2">
            <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>
              Dashboard
            </Link>
            <Link to="/visits" className={`nav-link ${isActive('/visits')}`}>
              Visits
            </Link>
            <Link to="/map" className={`nav-link ${isActive('/map')}`}>
              Map
            </Link>
            {user?.role === 'Admin' && (
              <Link to="/admin" className={`nav-link ${isActive('/admin')}`}>
                Admin
              </Link>
            )}
          </nav>

          {/* User Menu */}
          <div className="hidden md:flex items-center">
            <div className="relative ml-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{user?.name}</span>
                <button
                  onClick={logout}
                  className="btn btn-outline py-1 px-3 text-sm"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-neutral-700 hover:text-accent hover:bg-neutral-100 focus:outline-none"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-neutral-200 animate-fade-in">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              to="/dashboard"
              className={`nav-link block ${isActive('/dashboard')}`}
              onClick={closeMenu}
            >
              Dashboard
            </Link>
            <Link
              to="/visits"
              className={`nav-link block ${isActive('/visits')}`}
              onClick={closeMenu}
            >
              Visits
            </Link>
            <Link
              to="/map"
              className={`nav-link block ${isActive('/map')}`}
              onClick={closeMenu}
            >
              Map
            </Link>
            {user?.role === 'Admin' && (
              <Link
                to="/admin"
                className={`nav-link block ${isActive('/admin')}`}
                onClick={closeMenu}
              >
                Admin
              </Link>
            )}
          </div>
          <div className="pt-4 pb-3 border-t border-neutral-200">
            <div className="flex items-center justify-between px-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <User className="h-8 w-8 rounded-full bg-neutral-200 p-1" />
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium">{user?.name}</div>
                  <div className="text-sm text-neutral-500">{user?.role}</div>
                </div>
              </div>
              <button
                onClick={logout}
                className="btn btn-outline py-1 px-3 text-sm"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
