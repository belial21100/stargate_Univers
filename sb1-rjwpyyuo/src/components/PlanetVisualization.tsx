import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Building2, Droplet, Gem, Italic as Crystal, Users, Shield, Zap, Cpu, TrendingUp, Clock } from 'lucide-react';

const BUILDING_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  naquadah_mine: { icon: <Gem className="w-5 h-5" />, color: 'text-purple-400' },
  deuterium_synthesizer: { icon: <Droplet className="w-5 h-5" />, color: 'text-blue-400' },
  trinium_processor: { icon: <Crystal className="w-5 h-5" />, color: 'text-green-400' },
  zpm_facility: { icon: <Zap className="w-5 h-5" />, color: 'text-yellow-400' },
  gate_room: { icon: <Shield className="w-5 h-5" />, color: 'text-blue-400' },
  ancient_outpost: { icon: <Building2 className="w-5 h-5" />, color: 'text-indigo-400' },
  asgard_core: { icon: <Cpu className="w-5 h-5" />, color: 'text-pink-400' },
  house: { icon: <Users className="w-5 h-5" />, color: 'text-orange-400' }
};

interface ProgressInfo {
  progress: number;
  timeLeft: string;
  name: string;
  fromLevel: number;
  toLevel: number;
}

export const PlanetVisualization: React.FC = () => {
  const { currentCity, buildings, researchQueue } = useGameStore();
  const [selectedBuilding, setSelectedBuilding] = React.useState<string | null>(null);
  const [buildingProgress, setBuildingProgress] = React.useState<ProgressInfo | null>(null);
  const [researchProgress, setResearchProgress] = React.useState<ProgressInfo | null>(null);
  
  if (!currentCity?.buildings) return null;

  const cityBuildings = Object.entries(currentCity.buildings).map(([id, data]: [string, any]) => ({
    id,
    name: data.name || id.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    level: data.level,
    ...BUILDING_ICONS[id]
  }));

  // Calculate total production
  const totalProduction = buildings.reduce(
    (acc, building) => ({
      naquadah: acc.naquadah + building.production.naquadah,
      deuterium: acc.deuterium + building.production.deuterium,
      trinium: acc.trinium + building.production.trinium,
      people: acc.people + building.production.people,
    }),
    { naquadah: 0, deuterium: 0, trinium: 0, people: 0 }
  );

  // Calculate progress for active upgrades
  React.useEffect(() => {
    const updateProgress = () => {
      // Building progress
      const activeBuilding = buildings.find(b => b.isUpgrading);
      if (activeBuilding?.upgradeEndsAt) {
        const start = new Date(activeBuilding.upgradeEndsAt).getTime() - (activeBuilding.upgradeTime || 0) * 1000;
        const end = new Date(activeBuilding.upgradeEndsAt).getTime();
        const now = Date.now();
        const totalTime = end - start;
        const elapsed = now - start;
        const progress = (elapsed / totalTime) * 100;

        const timeLeft = end - now;
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        if (timeLeft > 0) {
          setBuildingProgress({
            progress: Math.min(100, Math.max(0, progress)),
            timeLeft: `${hours}h ${minutes}m ${seconds}s`,
            name: activeBuilding.name,
            fromLevel: activeBuilding.level,
            toLevel: activeBuilding.level + 1
          });
        } else {
          setBuildingProgress(null);
        }
      } else {
        setBuildingProgress(null);
      }

      // Research progress
      const activeResearch = researchQueue.find(q => !q.completed);
      if (activeResearch) {
        const start = new Date(activeResearch.start_time).getTime();
        const end = new Date(activeResearch.end_time).getTime();
        const now = Date.now();
        const totalTime = end - start;
        const elapsed = now - start;
        const progress = (elapsed / totalTime) * 100;

        const timeLeft = end - now;
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        if (timeLeft > 0) {
          const research = buildings.find(b => b.id === activeResearch.research_id);
          setResearchProgress({
            progress: Math.min(100, Math.max(0, progress)),
            timeLeft: `${hours}h ${minutes}m ${seconds}s`,
            name: research?.name || 'Research',
            fromLevel: activeResearch.from_level,
            toLevel: activeResearch.to_level
          });
        } else {
          setResearchProgress(null);
        }
      } else {
        setResearchProgress(null);
      }
    };

    updateProgress();
    const interval = setInterval(updateProgress, 1000);
    return () => clearInterval(interval);
  }, [buildings, researchQueue]);

  // Generate positions for building indicators
  const getPosition = (index: number, total: number) => {
    const angle = (index / total) * Math.PI * 2;
    const radius = 150;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    };
  };

  return (
    <div className="relative h-[600px] bg-gray-800/80 backdrop-blur-sm rounded-lg overflow-hidden">
      {/* Planet Background */}
      <div className="absolute inset-0">
        <img
          src="https://static.scientificamerican.com/sciam/cache/file/C454F5A6-536E-4C9F-AA6AF354BB85A85B_source.jpg?w=1350"
          alt="Planet Surface"
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/50 to-gray-900/80" />
      </div>

      {/* City Name and Info */}
      <div className="absolute top-6 left-6 z-10">
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-400" />
          {currentCity.name}
        </h2>
        <p className="text-gray-300">
          Coordinates: {currentCity.x}, {currentCity.y} • Population: {currentCity.people.toLocaleString()}
        </p>
      </div>

      {/* Production Stats */}
      <div className="absolute top-6 right-6 z-10">
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3 text-gray-300">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Production/s</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Gem className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 text-sm">+{totalProduction.naquadah.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Droplet className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 text-sm">+{totalProduction.deuterium.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Crystal className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm">+{totalProduction.trinium.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 text-sm">+{totalProduction.people.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="absolute bottom-6 left-6 right-6 z-10">
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 flex gap-4">
          {/* Building Progress */}
          {buildingProgress && (
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-gray-300">
                    {buildingProgress.name} ({buildingProgress.fromLevel} → {buildingProgress.toLevel})
                  </span>
                </div>
                <span className="text-blue-400">{buildingProgress.timeLeft}</span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-400 transition-all duration-1000"
                  style={{ width: `${buildingProgress.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Research Progress */}
          {researchProgress && (
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-gray-300">
                    {researchProgress.name} ({researchProgress.fromLevel} → {researchProgress.toLevel})
                  </span>
                </div>
                <span className="text-purple-400">{researchProgress.timeLeft}</span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-400 transition-all duration-1000"
                  style={{ width: `${researchProgress.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Building Indicators */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Center Point */}
        <div className="absolute w-4 h-4 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50" />

        {/* Building Connections */}
        {cityBuildings.map((building, index) => {
          const position = getPosition(index, cityBuildings.length);
          return (
            <React.Fragment key={building.id}>
              {/* Connection Line */}
              <div
                className="absolute w-px bg-gradient-to-b from-blue-400/50 to-transparent"
                style={{
                  height: '150px',
                  transform: `translate(${position.x}px, ${position.y}px) rotate(${Math.atan2(position.y, position.x)}rad)`,
                  transformOrigin: '0 0'
                }}
              />

              {/* Building Indicator */}
              <div
                className={`absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110`}
                style={{ left: `calc(50% + ${position.x}px)`, top: `calc(50% + ${position.y}px)` }}
                onMouseEnter={() => setSelectedBuilding(building.id)}
                onMouseLeave={() => setSelectedBuilding(null)}
              >
                <div className={`p-3 rounded-full bg-gray-800/90 ${building.color} ring-2 ring-offset-2 ring-offset-gray-800 ring-${building.color.replace('text-', '')}/50`}>
                  {building.icon}
                </div>

                {/* Building Info Tooltip */}
                {selectedBuilding === building.id && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-xl pointer-events-none">
                    <div className="text-sm font-medium text-white mb-1">{building.name}</div>
                    <div className="text-xs text-gray-300">Level {building.level}</div>
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};