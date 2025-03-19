import React from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export const ConnectionError: React.FC<{
  error: string;
  onRetry: () => void;
  isRetrying?: boolean;
}> = ({ error, onRetry, isRetrying = false }) => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-red-500/10 p-4 rounded-full">
              <Shield className="w-12 h-12 text-red-400" />
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="w-full bg-red-600 hover:bg-red-500 text-white py-2.5 px-4 rounded-lg transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Retry Connection'}
          </button>
          
          <p className="mt-4 text-sm text-gray-500">
            If the problem persists, please try again later or contact support.
          </p>
        </div>
      </div>
    </div>
  );
};