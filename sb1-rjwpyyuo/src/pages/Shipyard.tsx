import React from 'react';
import { useGameStore } from '../store/gameStore';
import { SHIPS } from '../data/ships';
import { Clock, AlertCircle } from 'lucide-react';

export const Shipyard: React.FC = () => {
  const { resources, currentCity } = useGameStore();
  const [error, setError] = React.useState<string | null>(null);

  const canBuildShip = (shipId: string) => {
    const ship = SHIPS.find(s => s.id === shipId);
    if (!ship) return false;

    return (
      resources.naquadah >= ship.cost.naquadah &&
      resources.deuterium >= ship.cost.deuterium &&
      resources.trinium >= ship.cost.trinium &&
      resources.people >= ship.cost.people
    );
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const handleBuildShip = async (shipId: string) => {
    setError(null);
    // TODO: Implement ship building logic
    console.log('Building ship:', shipId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Shipyard</h2>
        <div className="text-sm text-gray-400">
          Ships in dock: {Object.values(currentCity?.ships || {}).reduce((a, b) => a + b, 0)}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SHIPS.map(ship => (
          <div
            key={ship.id}
            className="bg-gray-800 rounded-lg overflow-hidden transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
          >
            <div className="h-48 relative">
              <img
                src={`https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=400&h=300`}
                alt={ship.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-xl font-bold text-white">{ship.name}</h3>
                <p className="text-gray-300 text-sm">
                  Quantity: {currentCity?.ships?.[ship.id] || 0}
                </p>
              </div>
            </div>

            <div className="p-4">
              <p className="text-gray-400 text-sm mb-4">{ship.description}</p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 bg-gray-700/50 rounded-lg p-3">
                  <div>
                    <div className="text-gray-400 text-sm">Attack</div>
                    <div className="text-red-400 font-medium">{ship.attack}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Defense</div>
                    <div className="text-green-400 font-medium">{ship.defense}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Shield</div>
                    <div className="text-blue-400 font-medium">{ship.shield}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Cargo</div>
                    <div className="text-yellow-400 font-medium">{ship.capacity}</div>
                  </div>
                </div>

                <button
                  onClick={() => handleBuildShip(ship.id)}
                  disabled={!canBuildShip(ship.id)}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-colors duration-200 flex flex-col items-center gap-1"
                >
                  <span className="font-medium">Build Ship</span>
                  <div className="text-xs text-blue-200 flex gap-2">
                    <span>{ship.cost.naquadah} Naquadah</span>
                    <span>{ship.cost.deuterium} Deuterium</span>
                    <span>{ship.cost.trinium} Trinium</span>
                  </div>
                  <div className="text-xs text-blue-200 flex items-center gap-1 mt-1">
                    <Clock className="w-4 h-4" />
                    {formatTime(ship.buildTime)}
                  </div>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};