import React from 'react';
import { Clock } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

const RESEARCH_IMAGES: Record<string, string> = {
  weapons_research: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&q=80&w=200&h=100',
  shield_technology: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&q=80&w=200&h=100',
  propulsion_systems: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=200&h=100',
  resource_extraction: 'https://images.unsplash.com/photo-1518623001395-125242310d0c?auto=format&fit=crop&q=80&w=200&h=100'
};

export const ResearchQueue: React.FC = () => {
  const { research, researchQueue } = useGameStore();
  const [loading, setLoading] = React.useState(true);
  const [timeLeft, setTimeLeft] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(false);
  }, []);

  // Update timer every second
  React.useEffect(() => {
    const activeResearch = researchQueue.find(q => !q.completed);
    if (!activeResearch) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const endTime = new Date(activeResearch.end_time).getTime();
      const diff = endTime - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [researchQueue]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-800/50 rounded-lg">
        <Clock className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  const activeResearch = researchQueue.find(q => !q.completed);

  if (!activeResearch) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-6 text-center">
        <div className="text-gray-400">No active research</div>
        <p className="text-sm text-gray-500 mt-2">Visit the Research Lab to start a new research project</p>
      </div>
    );
  }

  const researchType = research.find(r => r.id === activeResearch.research_id);
  if (!researchType) return null;

  return (
    <div className="bg-gray-800/50 rounded-lg overflow-hidden flex">
      <div className="w-24 h-24 relative flex-shrink-0">
        <img
          src={RESEARCH_IMAGES[researchType.id] || RESEARCH_IMAGES.weapons_research}
          alt={researchType.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/50 to-transparent" />
      </div>
      
      <div className="flex-1 p-4 flex items-center justify-between">
        <div>
          <div className="text-gray-200 font-medium">{researchType.name}</div>
          <div className="text-sm text-gray-400 mt-1">
            Level {activeResearch.from_level} → {activeResearch.to_level}
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-blue-300">
          <Clock className="w-4 h-4" />
          <span className="font-medium">
            {timeLeft || 'Calculating...'}
          </span>
        </div>
      </div>
    </div>
  );
};