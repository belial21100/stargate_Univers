/*
  # Fix resource production system

  1. Changes
    - Add last_update column to cities if not exists
    - Create function to calculate production rates
    - Create function to update resources
    - Add cron job to update resources periodically
    
  2. Security
    - All functions run with SECURITY DEFINER
    - Proper error handling and constraints
*/

-- Add last_update column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cities' AND column_name = 'last_update'
  ) THEN
    ALTER TABLE cities ADD COLUMN last_update timestamptz DEFAULT now();
  END IF;
END $$;

-- Function to calculate production rates based on buildings
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
    -- Skip buildings that are being upgraded
    IF EXISTS (
      SELECT 1 FROM building_upgrades
      WHERE building_id = building_key
      AND completed = false
    ) THEN
      CONTINUE;
    END IF;

    level := (building_data->>'level')::int;
    base_production := building_data->'production';
    
    -- Calculate production with level multiplier (20% increase per level)
    total_naquadah := total_naquadah + COALESCE((base_production->>'naquadah')::numeric, 0) * power(1.2, level - 1);
    total_deuterium := total_deuterium + COALESCE((base_production->>'deuterium')::numeric, 0) * power(1.2, level - 1);
    total_trinium := total_trinium + COALESCE((base_production->>'trinium')::numeric, 0) * power(1.2, level - 1);
    total_people := total_people + COALESCE((base_production->>'people')::numeric, 0) * power(1.2, level - 1);
  END LOOP;

  RETURN jsonb_build_object(
    'naquadah', total_naquadah,
    'deuterium', total_deuterium,
    'trinium', total_trinium,
    'people', total_people
  );
END;
$$;

-- Function to update resources for a specific city
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
  -- Get city data with lock
  SELECT * INTO city_record
  FROM cities
  WHERE id = city_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate time difference
  time_diff := now() - COALESCE(city_record.last_update, city_record.created_at);
  
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

-- Function to update all cities' resources
CREATE OR REPLACE FUNCTION public.update_all_cities_resources()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  city_record RECORD;
BEGIN
  FOR city_record IN 
    SELECT id 
    FROM cities 
    WHERE last_update < now() - interval '1 minute'
    ORDER BY last_update ASC
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.update_city_resources(city_record.id);
  END LOOP;
END;
$$;

-- Schedule resource updates every minute
SELECT cron.schedule(
  'update-city-resources',
  '* * * * *',
  'SELECT public.update_all_cities_resources()'
);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_city_production TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_city_resources TO authenticated;

-- Update all cities' resources now
SELECT public.update_all_cities_resources();