/*
  # Add people resource and house building
  
  1. Changes
    - Add people column to cities table
    - Update default buildings to include house
    - Update existing cities with new resource and building
    
  2. Security
    - Maintains existing RLS policies
    - Safe resource calculations
*/

-- Add people column to cities table
ALTER TABLE public.cities
ADD COLUMN IF NOT EXISTS people integer DEFAULT 1000 CHECK (people >= 0);

-- Update get_default_buildings function to include house
CREATE OR REPLACE FUNCTION public.get_default_buildings()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'naquadah_mine', jsonb_build_object(
      'level', 1,
      'production', jsonb_build_object('naquadah', 10, 'deuterium', 0, 'trinium', 0, 'people', 0)
    ),
    'deuterium_synthesizer', jsonb_build_object(
      'level', 1,
      'production', jsonb_build_object('naquadah', 0, 'deuterium', 5, 'trinium', 0, 'people', 0)
    ),
    'trinium_processor', jsonb_build_object(
      'level', 1,
      'production', jsonb_build_object('naquadah', 0, 'deuterium', 0, 'trinium', 3, 'people', 0)
    ),
    'zpm_facility', jsonb_build_object(
      'level', 1,
      'production', jsonb_build_object('naquadah', 15, 'deuterium', 8, 'trinium', 4, 'people', 0)
    ),
    'gate_room', jsonb_build_object(
      'level', 1,
      'production', jsonb_build_object('naquadah', 20, 'deuterium', 10, 'trinium', 5, 'people', 0)
    ),
    'ancient_outpost', jsonb_build_object(
      'level', 1,
      'production', jsonb_build_object('naquadah', 30, 'deuterium', 15, 'trinium', 8, 'people', 0)
    ),
    'asgard_core', jsonb_build_object(
      'level', 1,
      'production', jsonb_build_object('naquadah', 40, 'deuterium', 20, 'trinium', 10, 'people', 0)
    ),
    'house', jsonb_build_object(
      'level', 1,
      'production', jsonb_build_object('naquadah', 0, 'deuterium', 0, 'trinium', 0, 'people', 100)
    )
  );
$$;

-- Update existing cities with new resource and building
UPDATE public.cities
SET 
  buildings = public.get_default_buildings(),
  people = 1000
WHERE true;

-- Update calculate_city_production function to include people
CREATE OR REPLACE FUNCTION public.calculate_city_production(city_buildings jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  building_key text;
  building_data jsonb;
  total_naquadah numeric := 0;
  total_deuterium numeric := 0;
  total_trinium numeric := 0;
  total_people numeric := 0;
  level int;
  base_production jsonb;
BEGIN
  FOR building_key, building_data IN SELECT * FROM jsonb_each(city_buildings)
  LOOP
    level := (building_data->>'level')::int;
    base_production := building_data->'production';
    
    -- Calculate production with level multiplier (20% increase per level)
    total_naquadah := total_naquadah + (base_production->>'naquadah')::numeric * power(1.2, level - 1);
    total_deuterium := total_deuterium + (base_production->>'deuterium')::numeric * power(1.2, level - 1);
    total_trinium := total_trinium + (base_production->>'trinium')::numeric * power(1.2, level - 1);
    total_people := total_people + (base_production->>'people')::numeric * power(1.2, level - 1);
  END LOOP;

  RETURN jsonb_build_object(
    'naquadah', total_naquadah,
    'deuterium', total_deuterium,
    'trinium', total_trinium,
    'people', total_people
  );
END;
$$;

-- Update city_resources function to include people
CREATE OR REPLACE FUNCTION public.update_city_resources(city_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  city_record cities;
  time_diff interval;
  production_rates jsonb;
  naquadah_gain numeric;
  deuterium_gain numeric;
  trinium_gain numeric;
  people_gain numeric;
BEGIN
  -- Get city data
  SELECT * INTO city_record
  FROM cities
  WHERE id = city_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate time difference
  time_diff := now() - city_record.last_update;
  
  -- Get production rates based on buildings
  production_rates := public.calculate_city_production(city_record.buildings);
  
  -- Calculate resource gains (convert interval to hours)
  naquadah_gain := (EXTRACT(EPOCH FROM time_diff) / 3600) * (production_rates->>'naquadah')::numeric;
  deuterium_gain := (EXTRACT(EPOCH FROM time_diff) / 3600) * (production_rates->>'deuterium')::numeric;
  trinium_gain := (EXTRACT(EPOCH FROM time_diff) / 3600) * (production_rates->>'trinium')::numeric;
  people_gain := (EXTRACT(EPOCH FROM time_diff) / 3600) * (production_rates->>'people')::numeric;

  -- Update city resources
  UPDATE cities
  SET 
    naquadah = GREATEST(0, naquadah + floor(naquadah_gain)),
    deuterium = GREATEST(0, deuterium + floor(deuterium_gain)),
    trinium = GREATEST(0, trinium + floor(trinium_gain)),
    people = GREATEST(0, people + floor(people_gain)),
    last_update = now(),
    updated_at = now()
  WHERE id = city_id;
END;
$$;