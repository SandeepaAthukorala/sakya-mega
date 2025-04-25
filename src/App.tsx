import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import VisitFormPage from './pages/VisitFormPage';
import VisitListPage from './pages/VisitListPage';
import MapViewPage from './pages/MapViewPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import { useAuth } from './contexts/AuthContext';

function App() {
  const ConditionalRedirect = () => {
    const { user } = useAuth();

    if (user?.role === 'Admin') {
      return <Navigate to="/admin" replace />;
    } else if (user?.role === 'Ref') {
      return <Navigate to="/visits" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  };

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          <Route element={<Layout />}>
            <Route path="/" element={<ConditionalRedirect />} />
            
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/visits/new" 
              element={
                <ProtectedRoute>
                  <VisitFormPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/visits" 
              element={
                <ProtectedRoute>
                  <VisitListPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/map" 
              element={
                <ProtectedRoute>
                  <MapViewPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredRole="Admin">
                  <AdminDashboardPage />
                </ProtectedRoute>
              } 
            />
          </Route>
          
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <a
          href="https://yaksen.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-1 right-1 p-0 flex items-center justify-center gap-2 custom-floating-button"
          style={{zIndex: 1000}}
        >
          <img
            src="https://res.cloudinary.com/das8wrfd1/image/upload/v1739760282/logo_owiqet.png"
            alt="Yaksen Logo"
            className="h-4 w-4"
          />
          <span className="text-xs font-medium">Made by YAKSEN</span>
        </a>
      </Router>
    </AuthProvider>
  );
}

export default App;