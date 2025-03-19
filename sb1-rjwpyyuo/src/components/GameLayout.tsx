import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Shield, User, LogOut } from 'lucide-react';
import { ResourceDisplay } from './ResourceDisplay';
import { useGameStore } from '../store/gameStore';
import { LoadingSpinner } from './LoadingSpinner';
import { ConnectionError } from './ConnectionError';
import { BottomNav } from './BottomNav';

export const GameLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading: authLoading, initialized: authInitialized } = useAuthStore();
  const { fetchCities, cities, currentCity, error, initialized, retryInitialization } = useGameStore();
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [showTransition, setShowTransition] = React.useState(true);

  React.useEffect(() => {
    const initializeGame = async () => {
      if (!user || !authInitialized) return;
      
      try {
        await fetchCities();
        setIsLoading(false);
        setTimeout(() => {
          setShowTransition(false);
        }, 1500);
      } catch (err) {
        console.error('Error initializing game:', err);
        setIsLoading(false);
        setShowTransition(false);
      }
    };

    initializeGame();
  }, [user, authInitialized, fetchCities]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await retryInitialization();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleSignOut = async () => {
    if (isSigningOut) return;
    
    try {
      setIsSigningOut(true);
      await useAuthStore.getState().signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  };

  // Redirect to login if not authenticated
  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white flex items-center gap-3">
          <LoadingSpinner className="w-6 h-6" />
          Initializing...
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (authLoading || isLoading || showTransition) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-8">
          <Shield className="w-16 h-16 text-blue-400 animate-pulse" />
          <div className="text-white flex flex-col items-center gap-3">
            <LoadingSpinner className="w-8 h-8" />
            <p className="text-lg font-medium">
              {authLoading ? 'Loading...' : 'Initializing Stargate Command...'}
            </p>
            <p className="text-sm text-gray-400">Please stand by</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <ConnectionError error={error} onRetry={handleRetry} isRetrying={isRetrying} />;
  }

  if (!initialized || !cities.length || !currentCity) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white flex items-center gap-3">
          <LoadingSpinner className="w-6 h-6" />
          Initializing your base...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 bg-gray-800/95 backdrop-blur-sm shadow-lg z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl font-bold">Stargate SGC</h1>
            </div>

            <div className="flex items-center gap-6">
              <ResourceDisplay />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-gray-300">
                  <User className="w-5 h-5" />
                  <span>{profile?.username || profile.email}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningOut ? (
                    <>
                      <LoadingSpinner className="w-5 h-5" />
                      Signing out...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-5 h-5" />
                      Sign Out
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Padding for Fixed Header */}
      <main className="container mx-auto px-4 py-8 pt-28">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};