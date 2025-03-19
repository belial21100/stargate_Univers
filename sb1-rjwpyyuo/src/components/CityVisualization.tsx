import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Building2, Droplet, Gem, Italic as Crystal, Users, Shield, Zap, Cpu } from 'lucide-react';

const BUILDING_IMAGES: Record<string, { image: string; name: string; icon: React.ReactNode; description: string }> = {
  naquadah_mine: {
    image: 'https://images.unsplash.com/photo-1518623001395-125242310d0c?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Naquadah Mine',
    icon: <Gem className="w-5 h-5 text-purple-400" />,
    description: 'Extracts precious naquadah'
  },
  deuterium_synthesizer: {
    image: 'https://images.unsplash.com/photo-1581093458791-9f3c3250a8b5?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Deuterium Synthesizer',
    icon: <Droplet className="w-5 h-5 text-blue-400" />,
    description: 'Produces deuterium fuel'
  },
  trinium_processor: {
    image: 'https://images.unsplash.com/photo-1581093458791-9f3c3250a8b5?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Trinium Processor',
    icon: <Crystal className="w-5 h-5 text-green-400" />,
    description: 'Refines trinium ore'
  },
  zpm_facility: {
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'ZPM Facility',
    icon: <Zap className="w-5 h-5 text-yellow-400" />,
    description: 'Zero Point Module research'
  },
  gate_room: {
    image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Gate Room',
    icon: <Shield className="w-5 h-5 text-blue-400" />,
    description: 'Stargate operations center'
  },
  ancient_outpost: {
    image: 'https://images.unsplash.com/photo-1446776858070-70c3d5ed6758?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Ancient Outpost',
    icon: <Building2 className="w-5 h-5 text-indigo-400" />,
    description: 'Ancient technology research'
  },
  asgard_core: {
    image: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Asgard Core',
    icon: <Cpu className="w-5 h-5 text-pink-400" />,
    description: 'Advanced Asgard systems'
  },
  house: {
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=600&h=400',
    name: 'Living Quarters',
    icon: <Users className="w-5 h-5 text-orange-400" />,
    description: 'Personnel housing'
  }
};

export const CityVisualization: React.FC = () => {
  const { currentCity } = useGameStore();
  
  if (!currentCity?.buildings) return null;

  const buildings = Object.entries(currentCity.buildings)
    .map(([id, data]: [string, any]) => ({
      id,
      level: data.level,
      ...BUILDING_IMAGES[id]
    }))
    .filter(building => building.image);

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Hero Image */}
      <div className="relative h-64 md:h-96">
        <img
          src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000&h=800"
          alt="City Overview"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/50 to-gray-900" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-400" />
              {currentCity.name}
            </h2>
            <p className="text-gray-300 text-lg">
              Coordinates: {currentCity.x}, {currentCity.y} • Population: {currentCity.people.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Buildings Grid */}
      <div className="p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {buildings.map(building => (
            <div
              key={building.id}
              className="bg-gray-700/50 rounded-lg overflow-hidden transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group"
            >
              <div className="relative h-48">
                <img
                  src={building.image}
                  alt={building.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {building.icon}
                    <h3 className="text-lg font-semibold text-white">{building.name}</h3>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{building.description}</p>
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm font-medium">
                      Level {building.level}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};