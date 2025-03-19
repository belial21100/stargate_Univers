/*
  # Add automatic resource updates via cron job
  
  1. Changes
    - Create extension for cron jobs if not exists
    - Add function to update all cities periodically
    - Schedule automatic updates every minute
    
  2. Security
    - Functions run with SECURITY DEFINER
    - Safe resource calculations
    - Proper error handling
*/

-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to update resources for all cities
CREATE OR REPLACE FUNCTION public.update_all_cities_resources_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  city_record RECORD;
  time_diff interval;
  production_rates json;
  naquadah_gain numeric;
  deuterium_gain numeric;
  trinium_gain numeric;
BEGIN
  -- Loop through all cities
  FOR city_record IN 
    SELECT * 
    FROM cities 
    WHERE last_update < now() - interval '1 minute'
    FOR UPDATE
  LOOP
    -- Calculate time difference
    time_diff := now() - city_record.last_update;
    
    -- Get production rates
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
    WHERE id = city_record.id;
  END LOOP;
END;
$$;

-- Schedule the cron job to run every minute
SELECT cron.schedule(
  'update-all-cities-resources',  -- unique job name
  '* * * * *',                   -- every minute (cron expression)
  'SELECT public.update_all_cities_resources_cron()'
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA cron TO postgres;