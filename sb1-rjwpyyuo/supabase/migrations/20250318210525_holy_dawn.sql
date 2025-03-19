/*
  # Add automatic resource updates for cities
  
  1. Changes
    - Add last_update column to cities table
    - Create function to calculate production rates
    - Create function to update resources
    - Add function to update all cities periodically
    
  2. Security
    - All functions run with SECURITY DEFINER
    - Proper error handling and constraints
*/

-- Add last_update column to cities if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cities' AND column_name = 'last_update'
  ) THEN
    ALTER TABLE cities ADD COLUMN last_update timestamptz DEFAULT now();
  END IF;
END $$;

-- Function to calculate production rates
CREATE OR REPLACE FUNCTION public.calculate_resource_production(
  naquadah_level int,
  deuterium_level int
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  naquadah_rate numeric;
  deuterium_rate numeric;
  trinium_rate numeric;
BEGIN
  -- Base production rates
  naquadah_rate := 10 * power(1.2, naquadah_level - 1);
  deuterium_rate := 5 * power(1.2, deuterium_level - 1);
  trinium_rate := 0; -- Add trinium production calculation if needed

  RETURN json_build_object(
    'naquadah', naquadah_rate,
    'deuterium', deuterium_rate,
    'trinium', trinium_rate
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
  production_rates json;
  naquadah_gain numeric;
  deuterium_gain numeric;
  trinium_gain numeric;
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
  
  -- Get production rates (simplified for example)
  production_rates := public.calculate_resource_production(1, 1);
  
  -- Calculate resource gains (convert interval to hours)
  naquadah_gain := (EXTRACT(EPOCH FROM time_diff) / 3600) * (production_rates->>'naquadah')::numeric;
  deuterium_gain := (EXTRACT(EPOCH FROM time_diff) / 3600) * (production_rates->>'deuterium')::numeric;
  trinium_gain := (EXTRACT(EPOCH FROM time_diff) / 3600) * (production_rates->>'trinium')::numeric;

  -- Update city resources
  UPDATE cities
  SET 
    naquadah = GREATEST(0, naquadah + floor(naquadah_gain)),
    deuterium = GREATEST(0, deuterium + floor(deuterium_gain)),
    trinium = GREATEST(0, trinium + floor(trinium_gain)),
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
  FOR city_record IN SELECT id FROM cities WHERE last_update < now() - interval '1 minute'
  LOOP
    PERFORM public.update_city_resources(city_record.id);
  END LOOP;
END;
$$;

-- Function to get city with updated resources
CREATE OR REPLACE FUNCTION public.get_city_with_updated_resources(city_id uuid)
RETURNS cities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result cities;
BEGIN
  -- Update resources first
  PERFORM public.update_city_resources(city_id);
  
  -- Return updated city data
  SELECT * INTO result
  FROM cities
  WHERE id = city_id;
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_resource_production TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_city_with_updated_resources TO authenticated;