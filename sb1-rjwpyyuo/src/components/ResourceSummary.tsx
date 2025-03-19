import React from 'react';
import { useGameStore } from '../store/gameStore';
import { TrendingUp, Gem, Droplet, Italic as Crystal, Users } from 'lucide-react';

export const ResourceSummary: React.FC = () => {
  const { buildings } = useGameStore();

  const totalProduction = buildings.reduce(
    (acc, building) => ({
      naquadah: acc.naquadah + building.production.naquadah,
      deuterium: acc.deuterium + building.production.deuterium,
      trinium: acc.trinium + building.production.trinium,
      people: acc.people + building.production.people,
    }),
    { naquadah: 0, deuterium: 0, trinium: 0, people: 0 }
  );

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-200 mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-400" />
        Production per Second
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <Gem className="w-6 h-6 text-purple-400" />
          <div>
            <div className="text-purple-300 text-sm">Naquadah</div>
            <div className="text-lg font-semibold text-purple-400">
              +{totalProduction.naquadah.toFixed(1)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Droplet className="w-6 h-6 text-blue-400" />
          <div>
            <div className="text-blue-300 text-sm">Deuterium</div>
            <div className="text-lg font-semibold text-blue-400">
              +{totalProduction.deuterium.toFixed(1)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Crystal className="w-6 h-6 text-green-400" />
          <div>
            <div className="text-green-300 text-sm">Trinium</div>
            <div className="text-lg font-semibold text-green-400">
              +{totalProduction.trinium.toFixed(1)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-yellow-400" />
          <div>
            <div className="text-yellow-300 text-sm">Population</div>
            <div className="text-lg font-semibold text-yellow-400">
              +{totalProduction.people.toFixed(1)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};