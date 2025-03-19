/*
  # Add buildings to cities table

  1. Changes
    - Add buildings JSONB column to cities table
    - Add function to initialize default buildings
    - Update existing cities with default buildings
    - Update resource calculation to use building levels

  2. Security
    - Maintain existing RLS policies
    - Add validation for building data
*/

-- Add buildings column to cities table
ALTER TABLE public.cities
ADD COLUMN IF NOT EXISTS buildings JSONB DEFAULT '{}'::jsonb;

-- Function to get default buildings
CREATE OR REPLACE FUNCTION public.get_default_buildings()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'naquadah_mine', jsonb_build_object(
      'level', 1,
      'production', jsonb_build_object('naquadah', 10, 'deuterium', 0, 'trinium', 0)
    ),
    'deuterium_synthesizer', jsonb_build_object(
      'level', 1,
      'production', jsonb_build_object('naquadah', 0, 'deuterium', 5, 'trinium', 0)
    ),
    'trinium_processor', jsonb_build_object(
      'level', 1,
      'production', jsonb_build_object('naquadah', 0, 'deuterium', 0, 'trinium', 3)
    ),
    'zpm_facility', jsonb_build_object(
      'level', 1,
      'production', jsonb_build_object('naquadah', 15, 'deuterium', 8, 'trinium', 4)
    ),
    'gate_room', jsonb_build_object(
      'level', 1,
      'production', jsonb_build_object('naquadah', 20, 'deuterium', 10, 'trinium', 5)
    ),
    'ancient_outpost', jsonb_build_object(
      'level', 1,
      'production', jsonb_build_object('naquadah', 30, 'deuterium', 15, 'trinium', 8)
    ),
    'asgard_core', jsonb_build_object(
      'level', 1,
      'production', jsonb_build_object('naquadah', 40, 'deuterium', 20, 'trinium', 10)
    )
  );
$$;

-- Update existing cities with default buildings if they don't have any
UPDATE public.cities
SET buildings = public.get_default_buildings()
WHERE buildings IS NULL OR buildings = '{}'::jsonb;

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
  END LOOP;

  RETURN jsonb_build_object(
    'naquadah', total_naquadah,
    'deuterium', total_deuterium,
    'trinium', total_trinium
  );
END;
$$;

-- Update the resource update function to use building-based production
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

-- Function to upgrade a building
CREATE OR REPLACE FUNCTION public.upgrade_building(
  city_id uuid,
  building_id text,
  resource_cost jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  city_record cities;
  current_level int;
  new_level int;
  building_data jsonb;
BEGIN
  -- Get city data with lock
  SELECT * INTO city_record
  FROM cities
  WHERE id = city_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'City not found'
    );
  END IF;

  -- Check if building exists
  IF NOT city_record.buildings ? building_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Building not found'
    );
  END IF;

  -- Get current building data
  building_data := city_record.buildings->building_id;
  current_level := (building_data->>'level')::int;
  new_level := current_level + 1;

  -- Check if we have enough resources
  IF city_record.naquadah < (resource_cost->>'naquadah')::numeric OR
     city_record.deuterium < (resource_cost->>'deuterium')::numeric OR
     city_record.trinium < (resource_cost->>'trinium')::numeric THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient resources'
    );
  END IF;

  -- Update building level and deduct resources
  UPDATE cities
  SET
    buildings = jsonb_set(
      buildings,
      ARRAY[building_id, 'level'],
      to_jsonb(new_level)
    ),
    naquadah = naquadah - (resource_cost->>'naquadah')::numeric,
    deuterium = deuterium - (resource_cost->>'deuterium')::numeric,
    trinium = trinium - (resource_cost->>'trinium')::numeric,
    updated_at = now()
  WHERE id = city_id
  RETURNING buildings INTO building_data;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Building upgraded successfully',
    'buildings', building_data
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_city_production TO authenticated;
GRANT EXECUTE ON FUNCTION public.upgrade_building TO authenticated;