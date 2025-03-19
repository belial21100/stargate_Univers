import { Ship } from '../types/game';

export const SHIPS: Ship[] = [
  {
    id: 'f302',
    name: 'F-302 Fighter',
    description: 'Small but agile fighter craft, effective in large numbers.',
    attack: 10,
    defense: 5,
    shield: 3,
    speed: 12000,
    capacity: 0,
    cost: {
      naquadah: 2000,
      deuterium: 1000,
      trinium: 500,
      people: 2
    },
    buildTime: 600, // 10 minutes
    quantity: 0
  },
  {
    id: 'bc304',
    name: 'BC-304 Daedalus',
    description: 'Deep space carrier with powerful weapons and shields.',
    attack: 150,
    defense: 120,
    shield: 100,
    speed: 8000,
    capacity: 5000,
    cost: {
      naquadah: 20000,
      deuterium: 15000,
      trinium: 10000,
      people: 200
    },
    buildTime: 7200, // 2 hours
    quantity: 0
  },
  {
    id: 'hatak',
    name: "Ha'tak Vessel",
    description: 'Goa\'uld mothership with formidable weapons.',
    attack: 200,
    defense: 180,
    shield: 150,
    speed: 6000,
    capacity: 8000,
    cost: {
      naquadah: 30000,
      deuterium: 20000,
      trinium: 15000,
      people: 300
    },
    buildTime: 10800, // 3 hours
    quantity: 0
  },
  {
    id: 'aurora',
    name: 'Aurora Battleship',
    description: 'Ancient warship with advanced technology.',
    attack: 400,
    defense: 350,
    shield: 300,
    speed: 10000,
    capacity: 10000,
    cost: {
      naquadah: 50000,
      deuterium: 40000,
      trinium: 30000,
      people: 500
    },
    buildTime: 21600, // 6 hours
    quantity: 0
  },
  {
    id: 'cargo',
    name: 'Cargo Ship',
    description: 'Large transport vessel for resource movement.',
    attack: 1,
    defense: 50,
    shield: 30,
    speed: 4000,
    capacity: 25000,
    cost: {
      naquadah: 8000,
      deuterium: 6000,
      trinium: 4000,
      people: 50
    },
    buildTime: 3600, // 1 hour
    quantity: 0
  }
];