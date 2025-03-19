import React from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe2, Search, ZoomIn, ZoomOut, Navigation, Building2, Users, Database, AlertCircle, Shuffle } from 'lucide-react';
import type { City, MapCoordinates } from '../types/game';

interface MapState {
  zoom: number;
  pan: MapCoordinates;
  isDragging: boolean;
  dragStart: MapCoordinates;
  selectedCity: City | null;
}

const GRID_CELL_SIZE = 50;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const INITIAL_ZOOM = 1;
const ERROR_DISPLAY_TIME = 3000; // 3 seconds

export const UniverseMap: React.FC = () => {
  const { cities, currentCity } = useGameStore();
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const errorTimeoutRef = React.useRef<number>();
  const [state, setState] = React.useState<MapState>({
    zoom: INITIAL_ZOOM,
    pan: { x: 0, y: 0 },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    selectedCity: null
  });

  // Clear error after timeout
  React.useEffect(() => {
    if (error) {
      errorTimeoutRef.current = window.setTimeout(() => {
        setError(null);
      }, ERROR_DISPLAY_TIME);
    }
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [error]);

  const centerOnCoordinates = React.useCallback((coordinates: MapCoordinates, zoom: number) => {
    if (!mapRef.current) return;

    const mapWidth = mapRef.current.clientWidth;
    const mapHeight = mapRef.current.clientHeight;

    setState(prev => ({
      ...prev,
      pan: {
        x: (mapWidth / 2) - (coordinates.x * GRID_CELL_SIZE * zoom),
        y: (mapHeight / 2) - (coordinates.y * GRID_CELL_SIZE * zoom)
      },
      zoom
    }));
  }, []);

  // Center map on current city when component mounts or when current city changes
  React.useEffect(() => {
    if (!currentCity?.x || !currentCity?.y) {
      setError('Current city coordinates not found');
      return;
    }

    centerOnCoordinates({ x: currentCity.x, y: currentCity.y }, state.zoom);
  }, [currentCity, state.zoom, centerOnCoordinates]);

  // Re-center when window resizes
  React.useEffect(() => {
    const handleResize = () => {
      if (state.selectedCity?.x && state.selectedCity?.y) {
        centerOnCoordinates({ x: state.selectedCity.x, y: state.selectedCity.y }, state.zoom);
      } else if (currentCity?.x && currentCity?.y) {
        centerOnCoordinates({ x: currentCity.x, y: currentCity.y }, state.zoom);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentCity, state.selectedCity, state.zoom, centerOnCoordinates]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setState(prev => ({
      ...prev,
      isDragging: true,
      dragStart: {
        x: e.clientX - prev.pan.x,
        y: e.clientY - prev.pan.y
      }
    }));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!state.isDragging) return;
    setState(prev => ({
      ...prev,
      pan: {
        x: e.clientX - prev.dragStart.x,
        y: e.clientY - prev.dragStart.y
      }
    }));
  };

  const handleMouseUp = () => {
    setState(prev => ({ ...prev, isDragging: false }));
  };

  const handleZoom = (factor: number) => {
    const newZoom = Math.min(Math.max(MIN_ZOOM, state.zoom + factor), MAX_ZOOM);
    
    if (state.selectedCity?.x && state.selectedCity?.y) {
      centerOnCoordinates({ x: state.selectedCity.x, y: state.selectedCity.y }, newZoom);
    } else if (currentCity?.x && currentCity?.y) {
      centerOnCoordinates({ x: currentCity.x, y: currentCity.y }, newZoom);
    }
  };

  const handleCenterOnCity = () => {
    if (state.selectedCity?.x && state.selectedCity?.y) {
      centerOnCoordinates({ x: state.selectedCity.x, y: state.selectedCity.y }, state.zoom);
    } else if (currentCity?.x && currentCity?.y) {
      centerOnCoordinates({ x: currentCity.x, y: currentCity.y }, state.zoom);
    } else {
      setError('Cannot center: No city coordinates found');
    }
  };

  const getValidCities = () => {
    return cities.filter(city => 
      typeof city.x === 'number' && 
      typeof city.y === 'number' &&
      city.id !== state.selectedCity?.id
    );
  };

  const findNearestCity = () => {
    const baseCity = state.selectedCity || currentCity;
    
    if (!baseCity?.x || !baseCity?.y) {
      setError('Cannot find nearest city: No reference coordinates found');
      return;
    }

    const validCities = getValidCities();
    
    if (validCities.length === 0) {
      setError('No other cities found in the universe');
      return;
    }

    let nearestCity: City | null = null;
    let minDistance = Infinity;

    validCities.forEach(city => {
      if (typeof city.x !== 'number' || typeof city.y !== 'number') return;

      const dx = city.x - baseCity.x;
      const dy = city.y - baseCity.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance && distance > 0) {
        minDistance = distance;
        nearestCity = city;
      }
    });

    if (nearestCity && typeof nearestCity.x === 'number' && typeof nearestCity.y === 'number') {
      centerOnCoordinates({ x: nearestCity.x, y: nearestCity.y }, state.zoom);
      setState(prev => ({ ...prev, selectedCity: nearestCity }));
    } else {
      setError('No other cities found nearby');
    }
  };

  const findRandomCity = () => {
    const validCities = getValidCities();

    if (validCities.length === 0) {
      setError('No other cities found in the universe');
      return;
    }

    const randomCity = validCities[Math.floor(Math.random() * validCities.length)];
    
    if (typeof randomCity.x === 'number' && typeof randomCity.y === 'number') {
      centerOnCoordinates({ x: randomCity.x, y: randomCity.y }, state.zoom);
      setState(prev => ({ ...prev, selectedCity: randomCity }));
    }
  };

  const handleCityClick = (city: City) => {
    if (typeof city.x !== 'number' || typeof city.y !== 'number') {
      setError('Cannot center: City coordinates not found');
      return;
    }

    setState(prev => ({
      ...prev,
      selectedCity: prev.selectedCity?.id === city.id ? null : city
    }));
    
    centerOnCoordinates({ x: city.x, y: city.y }, state.zoom);
  };

  const getBuildingCount = (buildings: City['buildings']) => {
    return Object.keys(buildings || {}).length;
  };

  const validCitiesCount = cities.filter(city => 
    typeof city.x === 'number' && 
    typeof city.y === 'number'
  ).length;

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="relative w-full h-[600px] bg-gray-900 rounded-lg overflow-hidden border border-gray-700" ref={mapRef}>
        {/* Controls */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleZoom(0.1)}
            className="p-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors"
          >
            <ZoomIn className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleZoom(-0.1)}
            className="p-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors"
          >
            <ZoomOut className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleCenterOnCity}
            className="p-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors"
            title={state.selectedCity ? 'Center on selected city' : 'Center on your city'}
          >
            <Search className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={findNearestCity}
            className="p-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors"
            title={`Find nearest city (${validCitiesCount} available)`}
            disabled={validCitiesCount <= 1}
          >
            <Navigation className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={findRandomCity}
            className="p-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors"
            title={`Explore random city (${validCitiesCount} available)`}
            disabled={validCitiesCount <= 1}
          >
            <Shuffle className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Selected City Info */}
        <AnimatePresence>
          {state.selectedCity && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-4 z-10 bg-gray-800/95 backdrop-blur-sm rounded-lg p-4 border border-gray-700 shadow-xl"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-gray-700/50 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">{state.selectedCity.name}</h3>
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Database className="w-4 h-4" />
                      <span>Coordinates: {state.selectedCity.x}, {state.selectedCity.y}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Building2 className="w-4 h-4" />
                      <span>Buildings: {getBuildingCount(state.selectedCity.buildings)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Users className="w-4 h-4" />
                      <span>Population: {state.selectedCity.people}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map */}
        <div
          className="relative w-full h-full cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="absolute"
            style={{
              transform: `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`,
              transformOrigin: 'center',
              transition: state.isDragging ? 'none' : 'transform 0.3s ease-out'
            }}
          >
            {/* Grid */}
            <div
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
                width: '50000px',
                height: '50000px',
                transform: 'translate(-50%, -50%)',
                background: `
                  linear-gradient(to right, rgba(75, 85, 99, 0.1) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(75, 85, 99, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: `${GRID_CELL_SIZE}px ${GRID_CELL_SIZE}px`
              }}
            />

            {/* Cities */}
            {cities.map(city => {
              if (typeof city.x !== 'number' || typeof city.y !== 'number') return null;

              const isCurrentCity = city.id === currentCity?.id;
              const isSelected = city.id === state.selectedCity?.id;

              return (
                <motion.div
                  key={city.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2 cursor-pointer
                    ${isCurrentCity ? 'bg-blue-500' : 'bg-gray-500'}
                    ${isSelected ? 'ring-4 ring-blue-500/50' : ''}
                    hover:ring-4 hover:ring-blue-500/20 transition-all`}
                  style={{
                    left: city.x * GRID_CELL_SIZE,
                    top: city.y * GRID_CELL_SIZE
                  }}
                  onClick={() => handleCityClick(city)}
                >
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium">
                    {city.name}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Coordinates */}
        <div className="absolute bottom-4 left-4 bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-gray-300">
          Current Position: {state.selectedCity?.x || currentCity?.x || 0}, {state.selectedCity?.y || currentCity?.y || 0}
        </div>

        {/* City Count */}
        <div className="absolute bottom-4 right-4 bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-gray-300">
          Total Cities: {validCitiesCount}
        </div>
      </div>
    </div>
  );
};