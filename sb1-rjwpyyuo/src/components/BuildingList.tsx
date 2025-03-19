import React from 'react';
import { Building } from '../types/game';
import { useGameStore } from '../store/gameStore';
import { Clock } from 'lucide-react';

const BUILDING_IMAGES: Record<string, string> = {
  naquadah_mine:
    'https://images.shoutwiki.com/stargate/thumb/6/63/Abydos_naquadah_mine.jpg/660px-Abydos_naquadah_mine.jpg',
  deuterium_synthesizer:
    'https://static.wikia.nocookie.net/ogame/images/6/6f/Deuterium_Synthesizer.jpg/revision/latest?cb=20090624035456',
  trinium_processor:
    'https://media.fab.com/image_previews/gallery_images/28ec614f-91f2-4106-8432-05b5b6bd9970/6c9f852c-f7bf-4172-ba9c-2936448f5e52.jpg',
  zpm_facility:
    'https://pbs.twimg.com/media/Fb_2E3YakAAowIo?format=jpg&name=large',
  gate_room:
    'https://www.eklecty-city.fr/wp-content/uploads/2016/02/Stargate-La-Porte-des-Etoiles.jpg',
  ancient_outpost:
    'https://www.stargate-fusion.com/uploads/records/406/5995e67e-detail.jpg?v=a285c1152a7c52db441f88010e1e820c',
  asgard_core:
    'https://static.wikia.nocookie.net/stargate/images/1/18/Contacting_the_Asgard.png/revision/latest/scale-to-width-down/1000?cb=20240420174914',
  house:
    'https://static.wikia.nocookie.net/stargate/images/9/95/Samantha_Carter%27s_house.jpg/revision/latest/scale-to-width-down/1000?cb=20200915004011',
};

export const BuildingList: React.FC = () => {
  const { buildings, upgradeBuilding } = useGameStore();
  const [error, setError] = React.useState<string | null>(null);

  const handleUpgrade = async (buildingId: string) => {
    setError(null);
    const result = await upgradeBuilding(buildingId);
    if (!result.success && result.message) {
      setError(result.message);
    }
  };

  return (
    <div>
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {buildings.map((building) => (
          <BuildingCard
            key={building.id}
            building={building}
            onUpgrade={() => handleUpgrade(building.id)}
          />
        ))}
      </div>
    </div>
  );
};

const BuildingCard: React.FC<{
  building: Building;
  onUpgrade: () => void;
}> = ({ building, onUpgrade }) => {
  const [timeLeft, setTimeLeft] = React.useState<string>('');

  React.useEffect(() => {
    if (!building.isUpgrading || !building.upgradeEndsAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const endTime = new Date(building.upgradeEndsAt!).getTime();
      const diff = endTime - now;

      if (diff <= 0) {
        setTimeLeft('');
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
  }, [building.isUpgrading, building.upgradeEndsAt]);

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
      <div className="h-48 relative">
        <img
          src={BUILDING_IMAGES[building.id]}
          alt={building.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-xl font-bold text-white">{building.name}</h3>
          <p className="text-gray-300 text-sm">Level {building.level}</p>
        </div>
      </div>

      <div className="p-4">
        <p className="text-gray-400 text-sm">{building.description}</p>

        <div className="mt-4 space-y-3">
          <div className="bg-gray-700/50 rounded-lg p-3">
            <h4 className="text-gray-300 text-sm font-medium mb-2">
              Production per second:
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {building.production.naquadah > 0 && (
                <div className="text-purple-300">
                  Naquadah: +{building.production.naquadah}
                </div>
              )}
              {building.production.deuterium > 0 && (
                <div className="text-blue-300">
                  Deuterium: +{building.production.deuterium}
                </div>
              )}
              {building.production.trinium > 0 && (
                <div className="text-green-300">
                  Trinium: +{building.production.trinium}
                </div>
              )}
              {building.production.people > 0 && (
                <div className="text-yellow-300">
                  People: +{building.production.people}
                </div>
              )}
            </div>
          </div>

          {building.isUpgrading ? (
            <div className="bg-blue-900/50 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-blue-300">
                <Clock className="w-5 h-5 animate-spin" />
                <span className="font-medium">Upgrading...</span>
              </div>
              {timeLeft && (
                <p className="text-sm text-blue-200 mt-2">
                  Time remaining: {timeLeft}
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={onUpgrade}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-lg transition-colors duration-200 flex flex-col items-center gap-1"
            >
              <span className="font-medium">
                Upgrade to Level {building.level + 1}
              </span>
              <div className="text-xs text-blue-200 flex gap-2">
                <span>{building.cost.naquadah} Naquadah</span>
                <span>{building.cost.deuterium} Deuterium</span>
                <span>{building.cost.trinium} Trinium</span>
              </div>
              {building.upgradeTime && (
                <div className="text-xs text-blue-200 mt-1">
                  Time: {Math.floor(building.upgradeTime / 3600)}h{' '}
                  {Math.floor((building.upgradeTime % 3600) / 60)}m
                </div>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
