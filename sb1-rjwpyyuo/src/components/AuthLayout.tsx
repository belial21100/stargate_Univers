import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LoadingSpinner } from './LoadingSpinner';

export const AuthLayout: React.FC = () => {
  const { user, profile, loading, initialized } = useAuthStore();

  if (!initialized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white flex items-center gap-3">
          <LoadingSpinner className="w-6 h-6" />
          Initializing...
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">
          <LoadingSpinner className="w-6 h-6" />
        </div>
      </div>
    );
  }

  if (user && profile) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
};