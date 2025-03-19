import React from 'react';
import { Clock } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { supabase } from '../lib/supabase';

const BUILDING_IMAGES: Record<string, string> = {
  naquadah_mine: 'https://images.unsplash.com/photo-1518623001395-125242310d0c?auto=format&fit=crop&q=80&w=200&h=100',
  deuterium_synthesizer: 'https://images.unsplash.com/photo-1581093458791-9f3c3250a8b5?auto=format&fit=crop&q=80&w=200&h=100',
  trinium_processor: 'https://images.unsplash.com/photo-1581093458791-9f3c3250a8b5?auto=format&fit=crop&q=80&w=200&h=100',
  zpm_facility: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=200&h=100',
  gate_room: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=200&h=100',
  ancient_outpost: 'https://images.unsplash.com/photo-1446776858070-70c3d5ed6758?auto=format&fit=crop&q=80&w=200&h=100',
  asgard_core: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&q=80&w=200&h=100',
  house: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=200&h=100',
};

export const BuildingQueue: React.FC = () => {
  const { currentCity, buildings } = useGameStore();
  const [upgrades, setUpgrades] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchUpgrades = React.useCallback(async () => {
    if (!currentCity) return;

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('building_upgrades')
        .select('*')
        .eq('city_id', currentCity.id)
        .eq('completed', false)
        .order('end_time', { ascending: true });

      if (fetchError) throw fetchError;
      setUpgrades(data || []);
    } catch (error: any) {
      console.error('Error fetching upgrades:', error);
      setError('Failed to fetch building upgrades');
    } finally {
      setLoading(false);
    }
  }, [currentCity]);

  React.useEffect(() => {
    fetchUpgrades();

    // Subscribe to building_upgrades changes
    const subscription = supabase
      .channel('building_upgrades')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'building_upgrades',
          filter: `city_id=eq.${currentCity?.id}`
        },
        () => {
          fetchUpgrades();
        }
      )
      .subscribe();

    // Update timers every second
    const interval = setInterval(fetchUpgrades, 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [currentCity, fetchUpgrades]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-800/50 rounded-lg">
        <Clock className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  if (!upgrades.length) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-6 text-center">
        <div className="text-gray-400">No active building upgrades</div>
        <p className="text-sm text-gray-500 mt-2">Select a building to upgrade to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {upgrades.map(upgrade => {
        const building = buildings.find(b => b.id === upgrade.building_id);
        if (!building) return null;

        const endTime = new Date(upgrade.end_time);
        const now = new Date();
        const timeLeft = endTime.getTime() - now.getTime();
        
        if (timeLeft <= 0) return null;

        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        return (
          <div
            key={upgrade.id}
            className="bg-gray-800/50 rounded-lg overflow-hidden flex"
          >
            <div className="w-24 h-24 relative flex-shrink-0">
              <img
                src={BUILDING_IMAGES[building.id]}
                alt={building.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900/50 to-transparent" />
            </div>
            
            <div className="flex-1 p-4 flex items-center justify-between">
              <div>
                <div className="text-gray-200 font-medium">{building.name}</div>
                <div className="text-sm text-gray-400 mt-1">
                  Level {upgrade.from_level} → {upgrade.to_level}
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-blue-300">
                <Clock className="w-4 h-4" />
                <span className="font-medium">
                  {hours}h {minutes}m {seconds}s
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};