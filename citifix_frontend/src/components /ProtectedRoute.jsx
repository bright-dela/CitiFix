import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from './ui/LoadingSpinner';

const ProtectedRoute = ({ children, allowedTypes, requireActive = true }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (allowedTypes && !allowedTypes.includes(user.user_type)) {
    return <Navigate to="/unauthorized" />;
  }
  
  if (requireActive && user.status !== 'active') {
    if (user.status === 'pending') {
      return <Navigate to="/pending-approval" />;
    }
    return <Navigate to="/account-suspended" />;
  }
  
  return children;
};

export default ProtectedRoute;