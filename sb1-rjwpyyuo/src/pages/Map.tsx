import React from 'react';
import { UniverseMap } from '../components/UniverseMap';
import { supabase } from '../lib/supabase';

export const Map: React.FC = () => {
  const [cityCount, setCityCount] = React.useState<number>(0);

  React.useEffect(() => {
    const fetchCityCount = async () => {
      const { count, error } = await supabase
        .from('cities')
        .select('*', { count: 'exact', head: true });

      if (!error && count !== null) {
        setCityCount(count);
      }
    };

    fetchCityCount();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Universe Map</h2>
        <p className="text-gray-400">
          Explore the galaxy and locate other civilizations ({cityCount} total
          bases)
        </p>
      </div>

      <UniverseMap />
    </div>
  );
};
