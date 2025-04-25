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
      </Router>
    </AuthProvider>
  );
}

export default App;
