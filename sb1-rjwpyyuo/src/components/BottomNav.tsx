import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Building2, Shield, Rocket, Swords, Trophy, Beaker, Globe2 } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-4 py-2 z-50">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-around">
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              location.pathname === '/' 
                ? 'text-blue-400' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">Home</span>
          </Link>

          <Link
            to="/buildings"
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              location.pathname === '/buildings'
                ? 'text-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Building2 className="w-6 h-6" />
            <span className="text-xs font-medium">Buildings</span>
          </Link>

          <Link
            to="/research"
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              location.pathname === '/research'
                ? 'text-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Beaker className="w-6 h-6" />
            <span className="text-xs font-medium">Research</span>
          </Link>

          <Link
            to="/map"
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              location.pathname === '/map'
                ? 'text-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Globe2 className="w-6 h-6" />
            <span className="text-xs font-medium">Map</span>
          </Link>

          <div className="flex flex-col items-center">
            <Shield className="w-8 h-8 text-blue-400" />
            <span className="text-xs font-medium text-blue-400">SGC</span>
          </div>

          <Link
            to="/shipyard"
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              location.pathname === '/shipyard'
                ? 'text-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Rocket className="w-6 h-6" />
            <span className="text-xs font-medium">Shipyard</span>
          </Link>

          <Link
            to="/combat"
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              location.pathname === '/combat'
                ? 'text-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Swords className="w-6 h-6" />
            <span className="text-xs font-medium">Combat</span>
          </Link>

          <Link
            to="/hall-of-fame"
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              location.pathname === '/hall-of-fame'
                ? 'text-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Trophy className="w-6 h-6" />
            <span className="text-xs font-medium">Hall</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}