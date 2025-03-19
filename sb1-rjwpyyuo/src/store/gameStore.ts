import { create } from 'zustand';
import { Resource, GameState, Building, City, BuildingUpgrade, Ship, Fleet, Research, ResearchQueue } from '../types/game';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { SHIPS } from '../data/ships';

const SAVE_INTERVAL = 10000; // Save to database every 10 seconds
const UPDATE_INTERVAL = 1000; // Update resources every second

const INITIAL_STATE: GameState = {
  resources: {
    naquadah: 0,
    deuterium: 0,
    trinium: 0,
    people: 0
  },
  buildings: [],
  ships: SHIPS,
  fleets: [],
  research: [],
  researchQueue: [],
  lastUpdate: Date.now(),
  currentCity: null,
  cities: [],
  initialized: false,
  error: null
};

interface GameStore extends GameState {
  updateResources: () => void;
  upgradeBuilding: (buildingId: string) => Promise<{ success: boolean; message?: string }>;
  startResearch: (researchId: string) => Promise<{ success: boolean; message?: string }>;
  fetchCities: () => Promise<void>;
  setCurrentCity: (city: City) => void;
  saveResources: () => Promise<void>;
  retryInitialization: () => Promise<void>;
  checkBuildingUpgrades: () => Promise<void>;
  checkResearchQueue: () => Promise<void>;
}

const useGameStore = create<GameStore>((set, get) => ({
  ...INITIAL_STATE,
  
  fetchCities: async () => {
    const { user } = useAuthStore.getState();
    if (!user) {
      set({ error: 'No authenticated user found' });
      return;
    }

    try {
      // Subscribe to real-time updates for the cities table
      const citiesSubscription = supabase
        .channel('cities_channel')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'cities'
          },
          async () => {
            // Fetch fresh data whenever any change occurs
            const { data: allCities, error: refreshError } = await supabase
              .from('cities')
              .select(`
                *,
                profiles:user_id (
                  username,
                  email
                )
              `);

            if (!refreshError && allCities) {
              // Process cities to include usernames
              const processedCities = allCities.map(city => ({
                ...city,
                name: city.user_id === user.id ? city.name : `${city.profiles?.username}'s ${city.name}`
              }));

              // Update state with fresh data
              set(state => {
                // Find and update current city if it exists in the new data
                const updatedCurrentCity = state.currentCity 
                  ? processedCities.find(c => c.id === state.currentCity?.id)
                  : processedCities.find(c => c.user_id === user.id);

                return {
                  cities: processedCities,
                  currentCity: updatedCurrentCity || state.currentCity,
                  resources: updatedCurrentCity ? {
                    naquadah: updatedCurrentCity.naquadah,
                    deuterium: updatedCurrentCity.deuterium,
                    trinium: updatedCurrentCity.trinium,
                    people: updatedCurrentCity.people || 0
                  } : state.resources
                };
              });
            }
          }
        )
        .subscribe();

      // Initial fetch of all cities
      const { data: allCities, error: citiesError } = await supabase
        .from('cities')
        .select(`
          *,
          profiles:user_id (
            username,
            email
          )
        `);

      if (citiesError) {
        console.error('Error fetching cities:', citiesError);
        set({ error: 'Failed to fetch cities' });
        return;
      }

      // Get user's cities
      const userCities = allCities.filter(city => city.user_id === user.id);

      if (!userCities || userCities.length === 0) {
        set({ error: 'No cities found' });
        return;
      }

      // Get active building upgrades
      const { data: upgrades, error: upgradesError } = await supabase
        .from('building_upgrades')
        .select('*')
        .eq('city_id', userCities[0].id)
        .eq('completed', false);

      if (upgradesError) {
        console.error('Error fetching upgrades:', upgradesError);
      }

      // Get research types and levels
      const { data: researchTypes, error: researchError } = await supabase
        .from('research_types')
        .select('*');

      if (researchError) {
        console.error('Error fetching research types:', researchError);
        set({ error: 'Failed to fetch research types' });
        return;
      }

      const { data: researchLevels, error: levelsError } = await supabase
        .from('research_levels')
        .select('*')
        .eq('user_id', user.id);

      if (levelsError) {
        console.error('Error fetching research levels:', levelsError);
      }

      // Get active research queue
      const { data: researchQueue, error: queueError } = await supabase
        .from('research_queue')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .order('end_time', { ascending: true });

      if (queueError) {
        console.error('Error fetching research queue:', queueError);
      }

      // Map buildings with upgrade status
      const buildings = Object.entries(userCities[0].buildings || {}).map(([id, building]: [string, any]) => ({
        id,
        name: building.name || id.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        level: building.level || 1,
        cost: building.cost || { naquadah: 100, deuterium: 50, trinium: 25, people: 0 },
        production: building.production || { naquadah: 0, deuterium: 0, trinium: 0, people: 0 },
        description: building.description || '',
        isUpgrading: false,
        upgradeEndsAt: undefined
      }));

      // Update buildings with active upgrades
      if (upgrades) {
        upgrades.forEach(upgrade => {
          const building = buildings.find(b => b.id === upgrade.building_id);
          if (building) {
            building.isUpgrading = true;
            building.upgradeEndsAt = upgrade.end_time;
          }
        });
      }

      // Map research with levels and queue status
      const research = (researchTypes || []).map(type => {
        const level = researchLevels?.find(l => l.research_id === type.id)?.level || 0;
        const queueItem = researchQueue?.find(q => q.research_id === type.id);
        
        return {
          id: type.id,
          name: type.name,
          description: type.description,
          category: type.category,
          level,
          maxLevel: type.max_level,
          baseBonus: type.base_bonus,
          bonusType: type.bonus_type,
          bonusFactor: type.bonus_factor,
          cost: type.base_cost,
          requirements: type.requirements || {},
          upgradeTime: type.upgrade_time_base,
          isResearching: !!queueItem,
          researchEndsAt: queueItem?.end_time
        };
      });

      // Process cities to include usernames
      const processedCities = allCities.map(city => ({
        ...city,
        name: city.user_id === user.id ? city.name : `${city.profiles?.username}'s ${city.name}`
      }));

      set({
        cities: processedCities,
        currentCity: userCities[0],
        buildings,
        research,
        researchQueue: researchQueue || [],
        resources: {
          naquadah: userCities[0].naquadah,
          deuterium: userCities[0].deuterium,
          trinium: userCities[0].trinium,
          people: userCities[0].people || 0
        },
        initialized: true,
        error: null,
        lastUpdate: Date.now()
      });

      // Start checking for upgrades and research
      setInterval(() => {
        get().checkBuildingUpgrades();
        get().checkResearchQueue();
      }, 5000);

    } catch (error) {
      console.error('Error in fetchCities:', error);
      set({ error: 'Failed to initialize game data' });
    }
  },

  checkBuildingUpgrades: async () => {
    const { currentCity, buildings } = get();
    if (!currentCity) return;

    try {
      // Fetch active upgrades
      const { data: upgrades, error } = await supabase
        .from('building_upgrades')
        .select('*')
        .eq('city_id', currentCity.id)
        .eq('completed', false)
        .lt('end_time', new Date().toISOString());

      if (error) {
        console.error('Error checking building upgrades:', error);
        return;
      }

      if (!upgrades || upgrades.length === 0) return;

      // Fetch the latest city data
      const { data: city, error: cityError } = await supabase
        .from('cities')
        .select('*')
        .eq('id', currentCity.id)
        .single();

      if (cityError || !city) {
        console.error('Error fetching city data:', cityError);
        return;
      }

      // Update local state
      const updatedBuildings = buildings.map(building => {
        const cityBuilding = city.buildings[building.id];
        if (cityBuilding) {
          return {
            ...building,
            level: cityBuilding.level,
            isUpgrading: false,
            upgradeEndsAt: undefined
          };
        }
        return building;
      });

      set({
        buildings: updatedBuildings,
        currentCity: city,
        resources: {
          naquadah: city.naquadah,
          deuterium: city.deuterium,
          trinium: city.trinium,
          people: city.people || 0
        }
      });
    } catch (error) {
      console.error('Error in checkBuildingUpgrades:', error);
    }
  },

  checkResearchQueue: async () => {
    const { research } = get();
    if (!research.length) return;

    try {
      // Get completed research
      const { data: completed, error } = await supabase
        .from('research_queue')
        .select('*')
        .eq('completed', true)
        .gt('end_time', new Date(Date.now() - 60000).toISOString());

      if (error) {
        console.error('Error checking research queue:', error);
        return;
      }

      // Get active queue
      const { data: activeQueue, error: queueError } = await supabase
        .from('research_queue')
        .select('*')
        .eq('completed', false)
        .order('end_time', { ascending: true });

      if (queueError) {
        console.error('Error fetching active queue:', queueError);
        return;
      }

      // Update research levels
      const updatedResearch = research.map(r => {
        const completedResearch = completed?.find(c => c.research_id === r.id);
        if (completedResearch) {
          return {
            ...r,
            level: completedResearch.to_level,
            isResearching: false,
            researchEndsAt: undefined
          };
        }
        const activeResearch = activeQueue?.find(q => q.research_id === r.id);
        return {
          ...r,
          isResearching: !!activeResearch,
          researchEndsAt: activeResearch?.end_time
        };
      });

      set({ 
        research: updatedResearch,
        researchQueue: activeQueue || []
      });
    } catch (error) {
      console.error('Error in checkResearchQueue:', error);
    }
  },

  retryInitialization: async () => {
    set({ error: null, initialized: false });
    await get().fetchCities();
  },

  setCurrentCity: (city: City) => {
    set({
      currentCity: city,
      resources: {
        naquadah: city.naquadah,
        deuterium: city.deuterium,
        trinium: city.trinium,
        people: city.people || 0
      },
      lastUpdate: Date.now()
    });
  },

  saveResources: async () => {
    const { currentCity, resources } = get();
    if (!currentCity) return;

    try {
      const { error } = await supabase
        .from('cities')
        .update({
          naquadah: Math.floor(resources.naquadah),
          deuterium: Math.floor(resources.deuterium),
          trinium: Math.floor(resources.trinium),
          people: Math.floor(resources.people || 0),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentCity.id);

      if (error) {
        console.error('Error saving resources:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to save resources:', error);
    }
  },
  
  updateResources: () => {
    const currentTime = Date.now();
    const timeDiff = (currentTime - get().lastUpdate) / 1000;
    
    set(state => {
      const newResources = { ...state.resources };
      
      state.buildings.forEach(building => {
        if (!building.isUpgrading) {
          newResources.naquadah += building.production.naquadah * timeDiff;
          newResources.deuterium += building.production.deuterium * timeDiff;
          newResources.trinium += building.production.trinium * timeDiff;
          newResources.people += (building.production.people || 0) * timeDiff;
        }
      });
      
      return {
        resources: {
          ...newResources,
          people: Math.max(0, newResources.people || 0)
        },
        lastUpdate: currentTime
      };
    });
  },
  
  startResearch: async (researchId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('start_research', {
          p_research_id: researchId
        });

      if (error) {
        console.error('Error starting research:', error);
        return { success: false, message: error.message };
      }

      if (!data.success) {
        return { success: false, message: data.message };
      }

      // Update local state
      const { research, researchQueue } = get();
      const updatedResearch = research.map(r =>
        r.id === researchId
          ? {
              ...r,
              isResearching: true,
              researchEndsAt: data.end_time
            }
          : r
      );

      set({
        research: updatedResearch,
        researchQueue: [...researchQueue, {
          research_id: researchId,
          end_time: data.end_time,
          completed: false
        }]
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error in startResearch:', error);
      return { success: false, message: error.message || 'An unexpected error occurred' };
    }
  },

  upgradeBuilding: async (buildingId: string) => {
    const state = get();
    const { currentCity } = state;
    if (!currentCity) return { success: false, message: 'No city selected' };

    try {
      const { data, error } = await supabase
        .rpc('start_building_upgrade', {
          p_city_id: currentCity.id,
          p_building_id: buildingId
        });

      if (error) {
        console.error('Error starting building upgrade:', error);
        return { success: false, message: error.message };
      }

      if (!data.success) {
        return { success: false, message: data.message };
      }

      const upgrade = data.upgrade;
      const updatedBuildings = state.buildings.map(b =>
        b.id === buildingId
          ? {
              ...b,
              isUpgrading: true,
              upgradeEndsAt: upgrade.end_time
            }
          : b
      );

      set({
        buildings: updatedBuildings,
        resources: {
          naquadah: currentCity.naquadah,
          deuterium: currentCity.deuterium,
          trinium: currentCity.trinium,
          people: currentCity.people || 0
        }
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error in upgradeBuilding:', error);
      return { success: false, message: error.message || 'An unexpected error occurred' };
    }
  }
}));

if (typeof window !== 'undefined') {
  setInterval(() => {
    const store = useGameStore.getState();
    if (store.initialized && store.currentCity) {
      store.updateResources();
    }
  }, UPDATE_INTERVAL);

  setInterval(() => {
    const store = useGameStore.getState();
    if (store.initialized && store.currentCity) {
      store.saveResources();
      store.checkResearchQueue();
    }
  }, SAVE_INTERVAL);
}

export default useGameStore;

export { useGameStore };