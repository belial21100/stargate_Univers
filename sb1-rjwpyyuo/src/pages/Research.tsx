import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Research as ResearchType } from '../types/game';
import { Clock, AlertCircle, Beaker, Zap, Shield, Swords, Rocket, Cpu } from 'lucide-react';

const CATEGORY_ICONS = {
  infrastructure: <Zap className="w-6 h-6" />,
  resources: <Beaker className="w-6 h-6" />,
  defense: <Shield className="w-6 h-6" />,
  combat: <Swords className="w-6 h-6" />,
  propulsion: <Rocket className="w-6 h-6" />,
  special: <Cpu className="w-6 h-6" />
};

export const ResearchPage: React.FC = () => {
  const { research, researchQueue, startResearch } = useGameStore();
  const [error, setError] = React.useState<string | null>(null);

  const handleStartResearch = async (researchId: string) => {
    setError(null);
    const result = await startResearch(researchId);
    if (!result.success && result.message) {
      setError(result.message);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0h 0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const activeResearch = researchQueue.find(q => !q.completed);

  const calculateTimeLeft = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds };
  };

  // Update time left every second for active research
  React.useEffect(() => {
    if (!activeResearch) return;

    const interval = setInterval(() => {
      const timeLeft = calculateTimeLeft(activeResearch.end_time);
      if (!timeLeft) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeResearch]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Research Laboratory</h2>
        <p className="text-gray-400">Advance your technological capabilities through research</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {activeResearch && (
        <div className="bg-blue-900/50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-300 flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5" />
            Current Research
          </h3>
          
          {research.map(r => {
            if (r.id !== activeResearch.research_id) return null;
            
            const timeLeft = calculateTimeLeft(activeResearch.end_time);
            if (!timeLeft) return null;

            return (
              <div key={r.id} className="flex items-center gap-4">
                <div className="bg-blue-900/50 p-3 rounded-lg">
                  {CATEGORY_ICONS[r.category as keyof typeof CATEGORY_ICONS]}
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium">{r.name}</div>
                  <div className="text-sm text-blue-300">
                    Level {activeResearch.from_level} → {activeResearch.to_level}
                  </div>
                </div>
                <div className="text-blue-300 font-medium">
                  {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {research.map(r => (
          <div
            key={r.id}
            className="bg-gray-800 rounded-lg overflow-hidden transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-gray-700/50 p-3 rounded-lg">
                  {CATEGORY_ICONS[r.category as keyof typeof CATEGORY_ICONS]}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">{r.name}</h3>
                  <p className="text-sm text-gray-400">Level {r.level} / {r.maxLevel}</p>
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-4">{r.description}</p>

              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Current Bonus:</h4>
                  <div className="text-blue-400 font-medium">
                    +{Math.floor(r.baseBonus * Math.pow(1.2, r.level))}% {r.bonusType.split('_').join(' ')}
                  </div>
                </div>

                {Object.keys(r.requirements).length > 0 && (
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Requirements:</h4>
                    <div className="space-y-1">
                      {Object.entries(r.requirements).map(([reqId, reqLevel]) => {
                        const reqResearch = research.find(res => res.id === reqId);
                        const isMet = reqResearch && reqResearch.level >= reqLevel;
                        
                        return (
                          <div
                            key={reqId}
                            className={`text-sm ${isMet ? 'text-green-400' : 'text-red-400'}`}
                          >
                            {reqResearch?.name || reqId} Level {reqLevel}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleStartResearch(r.id)}
                  disabled={r.isResearching || !!activeResearch}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-colors duration-200 flex flex-col items-center gap-1"
                >
                  <span className="font-medium">
                    {r.isResearching ? 'Researching...' : 'Start Research'}
                  </span>
                  <div className="text-xs text-blue-200 flex gap-2">
                    <span>{r.cost.naquadah} Naquadah</span>
                    <span>{r.cost.deuterium} Deuterium</span>
                    <span>{r.cost.trinium} Trinium</span>
                  </div>
                  <div className="text-xs text-blue-200 flex items-center gap-1 mt-1">
                    <Clock className="w-4 h-4" />
                    {formatTime(r.upgradeTime)}
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