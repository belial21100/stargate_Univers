import React from 'react';
import { Gem, Droplet, Italic as Crystal, Users } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export const ResourceDisplay: React.FC = () => {
  const resources = useGameStore(state => state.resources);

  return (
    <div className="flex gap-6 bg-gray-800 p-4 rounded-lg">
      <div className="flex items-center gap-2">
        <Gem className="text-purple-400" />
        <span className="text-purple-400">{Math.floor(resources.naquadah)}</span>
      </div>
      <div className="flex items-center gap-2">
        <Droplet className="text-blue-400" />
        <span className="text-blue-400">{Math.floor(resources.deuterium)}</span>
      </div>
      <div className="flex items-center gap-2">
        <Crystal className="text-green-400" />
        <span className="text-green-400">{Math.floor(resources.trinium)}</span>
      </div>
      <div className="flex items-center gap-2">
        <Users className="text-yellow-400" />
        <span className="text-yellow-400">{Math.floor(resources.people)}</span>
      </div>
    </div>
  );
};