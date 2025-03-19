import React from 'react';
import { BuildingQueue } from '../components/BuildingQueue';
import { ResourceSummary } from '../components/ResourceSummary';
import { ResearchQueue } from '../components/ResearchQueue';
import { PlanetVisualization } from '../components/PlanetVisualization';

export const Home: React.FC = () => {
  return (
    <div className="relative min-h-screen">
      {/* Full-screen background */}
      <div className="fixed inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=3440&h=1920"
          alt="Grassland"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
      </div>

      {/* Content */}
      <div className="relative z-10 space-y-8">
        <div className="px-4">
          <PlanetVisualization />
        </div>

        <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-6 mx-4">
          <ResourceSummary />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-4">
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Active Construction</h2>
            <BuildingQueue />
          </div>

          <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Research Progress</h2>
            <ResearchQueue />
          </div>
        </div>
      </div>
    </div>
  );
};
