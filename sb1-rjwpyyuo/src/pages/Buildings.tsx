import React from 'react';
import { BuildingList } from '../components/BuildingList';

export const Buildings: React.FC = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Base Buildings</h2>
      <BuildingList />
    </div>
  );
};