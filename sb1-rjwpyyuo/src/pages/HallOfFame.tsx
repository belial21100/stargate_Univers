import React from 'react';
import { Trophy, Medal, Star, Crown, Target, Shield, Building2, Beaker, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface PlayerStats {
  id: string;
  username: string;
  email: string;
  building_score: number;
  research_score: number;
  city_score: number;
  total_population: number;
  total_score: number;
}

export const HallOfFame: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [players, setPlayers] = React.useState<PlayerStats[]>([]);

  React.useEffect(() => {
    const fetchPlayerStats = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('user_scores')
          .select('*')
          .order('total_score', { ascending: false });

        if (fetchError) throw fetchError;

        setPlayers(data || []);
      } catch (err: any) {
        console.error('Error fetching player stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerStats();

    // Subscribe to score changes
    const subscription = supabase
      .channel('user_scores_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_scores'
        },
        fetchPlayerStats
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner className="w-8 h-8 text-blue-400" />
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

  const topPlayers = players.slice(0, 3);
  const otherPlayers = players.slice(3);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Hall of Fame</h2>
        <p className="text-gray-400">Honoring the greatest commanders of the Stargate program</p>
      </div>

      {/* Top 3 Players */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {topPlayers.map((player, index) => (
          <div
            key={player.id}
            className="bg-gray-800 rounded-lg p-6 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-gray-700/50 p-3 rounded-lg">
                {index === 0 ? (
                  <Crown className="w-6 h-6 text-yellow-400" />
                ) : index === 1 ? (
                  <Medal className="w-6 h-6 text-gray-400" />
                ) : (
                  <Medal className="w-6 h-6 text-amber-600" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-white">{player.username || player.email.split('@')[0]}</h3>
                <p className="text-sm text-gray-400">Rank #{index + 1}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total Score:</span>
                <span className="text-blue-400 font-medium">{player.total_score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Building Score:</span>
                <span className="text-green-400 font-medium">{player.building_score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Research Score:</span>
                <span className="text-purple-400 font-medium">{player.research_score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Population:</span>
                <span className="text-yellow-400 font-medium">{player.total_population.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Other Players */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-700/50">
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Rank</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Commander</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Score</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Buildings</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Research</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Cities</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">Population</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {otherPlayers.map((player, index) => (
                <tr key={player.id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-400">#{index + 4}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                    {player.username || player.email.split('@')[0]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-blue-400 font-medium">
                    {player.total_score.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-green-400">
                    {player.building_score.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-purple-400">
                    {player.research_score.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-orange-400">
                    {(player.city_score / 1000).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-yellow-400">
                    {player.total_population.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Legend */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4">Scoring System</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-green-400" />
            <div>
              <div className="text-sm font-medium text-white">Building Levels</div>
              <div className="text-xs text-gray-400">100 points per level</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Beaker className="w-5 h-5 text-purple-400" />
            <div>
              <div className="text-sm font-medium text-white">Research Levels</div>
              <div className="text-xs text-gray-400">200 points per level</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-orange-400" />
            <div>
              <div className="text-sm font-medium text-white">Cities</div>
              <div className="text-xs text-gray-400">1,000 points per city</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-yellow-400" />
            <div>
              <div className="text-sm font-medium text-white">Population</div>
              <div className="text-xs text-gray-400">1 point per citizen</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};