/*
  # Fix empty buildings in cities table

  1. Changes
    - Add default buildings to cities with null or empty buildings
    - Update building structure to match game requirements
    - Add check constraint to ensure buildings column is not null
    
  2. Security
    - Maintains existing RLS policies
    - Preserves data integrity
*/

-- Function to get default buildings structure
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

-- Set default buildings for cities with null or empty buildings
UPDATE public.cities
SET 
  buildings = public.get_default_buildings(),
  updated_at = now()
WHERE 
  buildings IS NULL 
  OR buildings = '{}'::jsonb
  OR buildings = 'null'::jsonb;

-- Add not null constraint to buildings column
ALTER TABLE public.cities 
ALTER COLUMN buildings SET NOT NULL,
ALTER COLUMN buildings SET DEFAULT public.get_default_buildings();

-- Add trigger to ensure buildings column is never null
CREATE OR REPLACE FUNCTION public.ensure_buildings_not_null()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.buildings IS NULL OR NEW.buildings = '{}'::jsonb OR NEW.buildings = 'null'::jsonb THEN
    NEW.buildings := public.get_default_buildings();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER ensure_buildings_not_null
  BEFORE INSERT OR UPDATE ON public.cities
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_buildings_not_null();

-- Update create_initial_city function to use default buildings
CREATE OR REPLACE FUNCTION public.create_initial_city()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.cities (
    user_id,
    name,
    naquadah,
    deuterium,
    trinium,
    people,
    buildings,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    'Main Base',
    1000,
    500,
    200,
    1000,
    public.get_default_buildings(),
    now(),
    now()
  );
  RETURN NEW;
END;
$$;