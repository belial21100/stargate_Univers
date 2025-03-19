import { Building } from './buildings';

export interface Resource {
  naquadah: number;
  deuterium: number;
  trinium: number;
  people: number;
}

export interface Research {
  id: string;
  name: string;
  description: string;
  category: string;
  level: number;
  maxLevel: number;
  cost: Resource;
  baseBonus: number;
  bonusType: string;
  requirements: { [key: string]: number };
  upgradeTime: number;
  isResearching?: boolean;
  researchEndsAt?: string;
}

export interface ResearchQueue {
  id: string;
  researchId: string;
  fromLevel: number;
  toLevel: number;
  startTime: string;
  endTime: string;
  completed: boolean;
}

export interface Ship {
  id: string;
  name: string;
  description: string;
  attack: number;
  defense: number;
  shield: number;
  speed: number;
  capacity: number;
  cost: Resource;
  buildTime: number;
  quantity: number;
}

export interface Fleet {
  id: string;
  cityId: string;
  ships: { [key: string]: number };
  mission?: 'attack' | 'transport' | 'colonize';
  targetCityId?: string;
  departureTime?: string;
  arrivalTime?: string;
  returningTime?: string;
  resources?: Resource;
  status: 'ready' | 'traveling' | 'returning' | 'fighting';
}

export interface CombatReport {
  id: string;
  date: string;
  attacker: {
    cityId: string;
    cityName: string;
    ships: { [key: string]: number };
    losses: { [key: string]: number };
  };
  defender: {
    cityId: string;
    cityName: string;
    ships: { [key: string]: number };
    losses: { [key: string]: number };
  };
  result: 'victory' | 'defeat' | 'draw';
  resourcesStolen?: Resource;
}

export interface Building {
  id: string;
  name: string;
  level: number;
  cost: Resource;
  production: Resource;
  description: string;
  upgradeTime?: number;
  isUpgrading?: boolean;
  upgradeEndsAt?: string;
}

export interface BuildingUpgrade {
  id: string;
  buildingId: string;
  fromLevel: number;
  toLevel: number;
  startTime: string;
  endTime: string;
  completed: boolean;
}

export interface MapCoordinates {
  x: number;
  y: number;
}

export interface CityProfile {
  username?: string;
  email: string;
}

export interface City {
  id: string;
  user_id: string;
  name: string;
  naquadah: number;
  deuterium: number;
  trinium: number;
  people: number;
  created_at: string;
  updated_at: string;
  buildings: { [key: string]: Building };
  ships: { [key: string]: number };
  upgrades?: BuildingUpgrade[];
  x?: number;
  y?: number;
  profiles?: CityProfile;
}

export interface GameState {
  resources: Resource;
  buildings: Building[];
  ships: Ship[];
  fleets: Fleet[];
  research: Research[];
  researchQueue: ResearchQueue[];
  lastUpdate: number;
  currentCity: City | null;
  cities: City[];
  initialized: boolean;
  error: string | null;
}