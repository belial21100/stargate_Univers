import React from 'react';
import { useGameStore } from '../store/gameStore';
import { SHIPS } from '../data/ships';
import { Swords, Target, Shield as ShieldIcon, Beaker, Dice1 as Dice, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BattleFactors {
  luck: number;
  morale: number;
  terrain: number;
  surprise: number;
}

export const Combat: React.FC = () => {
  const { currentCity, research } = useGameStore();
  const [attackerShips, setAttackerShips] = React.useState<{ [key: string]: number }>({});
  const [defenderShips, setDefenderShips] = React.useState<{ [key: string]: number }>({});
  const [simResult, setSimResult] = React.useState<any>(null);
  const [attackerLevels, setAttackerLevels] = React.useState<{ [key: string]: number }>({});
  const [defenderLevels, setDefenderLevels] = React.useState<{ [key: string]: number }>({});
  const [battleFactors, setBattleFactors] = React.useState<BattleFactors>({
    luck: 1.0,
    morale: 1.0,
    terrain: 1.0,
    surprise: 1.0
  });
  const [isSimulating, setIsSimulating] = React.useState(false);

  React.useEffect(() => {
    // Initialize simulated levels with current research levels
    const initialLevels = research.reduce((acc, r) => ({
      ...acc,
      [r.id]: r.level
    }), {});
    setAttackerLevels(initialLevels);
    setDefenderLevels(initialLevels);
  }, [research]);

  const updateShipCount = (
    side: 'attacker' | 'defender',
    shipId: string,
    count: number
  ) => {
    // Ensure count is between 0 and 100000
    const validCount = Math.min(Math.max(0, count), 100000);
    
    const setState = side === 'attacker' ? setAttackerShips : setDefenderShips;
    setState(prev => ({
      ...prev,
      [shipId]: validCount
    }));
  };

  const updateResearchLevel = (
    side: 'attacker' | 'defender',
    researchId: string,
    level: number
  ) => {
    const researchType = research.find(r => r.id === researchId);
    if (!researchType) return;

    // Ensure level is between 0 and maxLevel
    const validLevel = Math.min(Math.max(0, level), researchType.maxLevel);
    
    const setState = side === 'attacker' ? setAttackerLevels : setDefenderLevels;
    setState(prev => ({
      ...prev,
      [researchId]: validLevel
    }));
  };

  const updateBattleFactor = (factor: keyof BattleFactors, value: number) => {
    setBattleFactors(prev => ({
      ...prev,
      [factor]: Math.min(Math.max(0.5, value), 2.0)
    }));
  };

  // Calculate research bonuses using simulated levels
  const calculateResearchBonuses = (side: 'attacker' | 'defender') => {
    const levels = side === 'attacker' ? attackerLevels : defenderLevels;
    const weaponsResearch = research.find(r => r.id === 'weapons_research');
    const shieldResearch = research.find(r => r.id === 'shield_technology');
    
    const weaponsLevel = levels['weapons_research'] || 0;
    const shieldLevel = levels['shield_technology'] || 0;
    
    const attackBonus = weaponsResearch 
      ? 1 + (weaponsResearch.baseBonus * Math.pow(weaponsResearch.bonusFactor, weaponsLevel)) / 100
      : 1;
      
    const defenseBonus = shieldResearch
      ? 1 + (shieldResearch.baseBonus * Math.pow(shieldResearch.bonusFactor, shieldLevel)) / 100
      : 1;

    return { attackBonus, defenseBonus };
  };

  const calculateTotalStats = (side: 'attacker' | 'defender', ships: { [key: string]: number }) => {
    const { attackBonus, defenseBonus } = calculateResearchBonuses(side);

    return Object.entries(ships).reduce(
      (acc, [shipId, count]) => {
        const ship = SHIPS.find(s => s.id === shipId);
        if (!ship || count <= 0) return acc;

        return {
          attack: acc.attack + (ship.attack * attackBonus * count),
          defense: acc.defense + (ship.defense * count),
          shield: acc.shield + (ship.shield * defenseBonus * count)
        };
      },
      { attack: 0, defense: 0, shield: 0 }
    );
  };

  const simulateBattle = async () => {
    setIsSimulating(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate battle calculation time
      
      const attackerStats = calculateTotalStats('attacker', attackerShips);
      const defenderStats = calculateTotalStats('defender', defenderShips);

      // Apply battle factors
      const combinedLuckFactor = battleFactors.luck * (0.8 + Math.random() * 0.4); // Random 0.8-1.2
      const attackerPower = attackerStats.attack * 
        combinedLuckFactor * 
        battleFactors.morale * 
        (battleFactors.surprise > 1 ? battleFactors.surprise : 1);

      const defenderPower = (defenderStats.defense + defenderStats.shield) * 
        (2 - combinedLuckFactor) * // Inverse luck effect
        battleFactors.terrain * 
        (battleFactors.surprise < 1 ? 1/battleFactors.surprise : 1);

      // Calculate losses based on power difference
      const powerDifference = Math.abs(attackerPower - defenderPower) / Math.max(attackerPower, defenderPower);
      const baseLosses = 20 + Math.random() * 40; // 20-60% base losses
      
      const attackerLosses = Math.floor(
        baseLosses * (attackerPower > defenderPower ? 0.7 : 1.3) * 
        (1 + powerDifference * (attackerPower > defenderPower ? -0.3 : 0.3))
      );
      
      const defenderLosses = Math.floor(
        baseLosses * (defenderPower > attackerPower ? 0.7 : 1.3) * 
        (1 + powerDifference * (defenderPower > attackerPower ? -0.3 : 0.3))
      );

      const result = {
        winner: attackerPower > defenderPower ? 'attacker' : 'defender',
        attackerLosses,
        defenderLosses,
        stats: {
          attacker: {
            ...attackerStats,
            finalPower: attackerPower,
            factors: {
              luck: combinedLuckFactor,
              morale: battleFactors.morale,
              surprise: battleFactors.surprise > 1 ? battleFactors.surprise : 1
            }
          },
          defender: {
            ...defenderStats,
            finalPower: defenderPower,
            factors: {
              luck: 2 - combinedLuckFactor,
              terrain: battleFactors.terrain,
              surprise: battleFactors.surprise < 1 ? 1/battleFactors.surprise : 1
            }
          }
        }
      };

      setSimResult(result);
    } finally {
      setIsSimulating(false);
    }
  };

  // Get relevant research for display
  const combatResearch = research.filter(r => 
    ['weapons_research', 'shield_technology'].includes(r.id)
  );

  const attackerBonuses = calculateResearchBonuses('attacker');
  const defenderBonuses = calculateResearchBonuses('defender');

  const BattleFactorsControls: React.FC = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 mb-8 border border-gray-700/50"
    >
      <h3 className="text-lg font-medium text-blue-300 flex items-center gap-2 mb-4">
        <Dice className="w-5 h-5" />
        Battle Factors
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-white font-medium">Luck Factor</div>
            <div className="text-sm text-blue-400">{battleFactors.luck.toFixed(2)}x</div>
          </div>
          <input
            type="range"
            value={battleFactors.luck}
            onChange={e => updateBattleFactor('luck', parseFloat(e.target.value))}
            min={0.5}
            max={2.0}
            step={0.1}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-white font-medium">Morale</div>
            <div className="text-sm text-blue-400">{battleFactors.morale.toFixed(2)}x</div>
          </div>
          <input
            type="range"
            value={battleFactors.morale}
            onChange={e => updateBattleFactor('morale', parseFloat(e.target.value))}
            min={0.5}
            max={2.0}
            step={0.1}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-white font-medium">Terrain Advantage</div>
            <div className="text-sm text-blue-400">{battleFactors.terrain.toFixed(2)}x</div>
          </div>
          <input
            type="range"
            value={battleFactors.terrain}
            onChange={e => updateBattleFactor('terrain', parseFloat(e.target.value))}
            min={0.5}
            max={2.0}
            step={0.1}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-white font-medium">Surprise Factor</div>
            <div className="text-sm text-blue-400">{battleFactors.surprise.toFixed(2)}x</div>
          </div>
          <input
            type="range"
            value={battleFactors.surprise}
            onChange={e => updateBattleFactor('surprise', parseFloat(e.target.value))}
            min={0.5}
            max={2.0}
            step={0.1}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>
    </motion.div>
  );

  const ResearchControls: React.FC<{
    side: 'attacker' | 'defender';
    levels: { [key: string]: number };
    bonuses: { attackBonus: number; defenseBonus: number };
  }> = ({ side, levels, bonuses }) => (
    <motion.div 
      initial={{ opacity: 0, x: side === 'attacker' ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      <h4 className={`text-lg font-medium ${side === 'attacker' ? 'text-red-400' : 'text-blue-400'}`}>
        {side === 'attacker' ? 'Attacker' : 'Defender'} Research
      </h4>
      {combatResearch.map(r => (
        <div key={r.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">{r.name}</div>
              <div className="text-sm text-gray-400">Base Level: {r.level}</div>
            </div>
            <div className="text-sm text-blue-400">
              +{Math.round((r.id === 'weapons_research' ? bonuses.attackBonus - 1 : bonuses.defenseBonus - 1) * 100)}%
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <input
              type="range"
              value={levels[r.id] || 0}
              onChange={e => updateResearchLevel(side, r.id, parseInt(e.target.value))}
              min={0}
              max={r.maxLevel}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <input
              type="number"
              value={levels[r.id] || 0}
              onChange={e => updateResearchLevel(side, r.id, parseInt(e.target.value))}
              min={0}
              max={r.maxLevel}
              className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-center"
            />
          </div>
        </div>
      ))}
    </motion.div>
  );

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-bold text-white mb-6">Combat Simulator</h2>

        <BattleFactorsControls />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 mb-8 border border-gray-700/50"
        >
          <h3 className="text-lg font-medium text-blue-300 flex items-center gap-2 mb-4">
            <Beaker className="w-5 h-5" />
            Research Simulation
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <ResearchControls
              side="attacker"
              levels={attackerLevels}
              bonuses={attackerBonuses}
            />
            <ResearchControls
              side="defender"
              levels={defenderLevels}
              bonuses={defenderBonuses}
            />
          </div>
        </motion.div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Attacker */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50"
          >
            <h3 className="text-lg font-medium text-red-400 flex items-center gap-2 mb-4">
              <Swords className="w-5 h-5" />
              Attacking Forces
            </h3>

            <div className="space-y-4">
              {SHIPS.map(ship => (
                <motion.div
                  key={ship.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=50&h=50"
                      alt={ship.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-200">{ship.name}</div>
                      <div className="text-xs text-gray-400">Available: {currentCity?.ships?.[ship.id] || 0}</div>
                    </div>
                    <input
                      type="number"
                      value={attackerShips[ship.id] || 0}
                      onChange={e => updateShipCount('attacker', ship.id, parseInt(e.target.value) || 0)}
                      min={0}
                      max={100000}
                      className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right"
                    />
                  </div>
                  <input
                    type="range"
                    value={attackerShips[ship.id] || 0}
                    onChange={e => updateShipCount('attacker', ship.id, parseInt(e.target.value))}
                    min={0}
                    max={100000}
                    step={100}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Defender */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50"
          >
            <h3 className="text-lg font-medium text-blue-400 flex items-center gap-2 mb-4">
              <ShieldIcon className="w-5 h-5" />
              Defending Forces
            </h3>

            <div className="space-y-4">
              {SHIPS.map(ship => (
                <motion.div
                  key={ship.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=50&h=50"
                      alt={ship.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-200">{ship.name}</div>
                      <div className="text-xs text-gray-400">Simulated defense</div>
                    </div>
                    <input
                      type="number"
                      value={defenderShips[ship.id] || 0}
                      onChange={e => updateShipCount('defender', ship.id, parseInt(e.target.value) || 0)}
                      min={0}
                      max={100000}
                      className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right"
                    />
                  </div>
                  <input
                    type="range"
                    value={defenderShips[ship.id] || 0}
                    onChange={e => updateShipCount('defender', ship.id, parseInt(e.target.value))}
                    min={0}
                    max={100000}
                    step={100}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="flex justify-center mt-6">
          <motion.button
            onClick={simulateBattle}
            disabled={isSimulating}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSimulating ? (
              <>
                <Target className="w-5 h-5 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Target className="w-5 h-5" />
                Simulate Battle
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      <AnimatePresence>
        {simResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-400" />
              Battle Results
            </h3>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-medium text-red-400 mb-3">Attacker</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Final Power:</span>
                    <span className="text-red-400">{Math.floor(simResult.stats.attacker.finalPower)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Losses:</span>
                    <span className="text-red-400">{simResult.attackerLosses}%</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-medium text-blue-400 mb-3">Defender</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Final Power:</span>
                    <span className="text-blue-400">{Math.floor(simResult.stats.defender.finalPower)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Losses:</span>
                    <span className="text-blue-400">{simResult.defenderLosses}%</span>
                  </div>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 text-center"
            >
              <div className="text-lg font-medium">
                Winner:{' '}
                <span className={simResult.winner === 'attacker' ? 'text-red-400' : 'text-blue-400'}>
                  {simResult.winner === 'attacker' ? 'Attacker' : 'Defender'}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};