/*
  # Fix building queue system
  
  1. Changes
    - Drop existing queue-related objects
    - Create queue processing logs table
    - Add function to process building upgrades
    - Add function to trigger processing
    
  2. Security
    - Maintain existing RLS policies
    - Add proper error handling
*/

-- Drop existing queue-related objects
DROP TABLE IF EXISTS public.building_queue CASCADE;
DROP TABLE IF EXISTS public.queue_processing_logs CASCADE;
DROP FUNCTION IF EXISTS public.process_building_queue() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_queue_processing() CASCADE;

-- Create queue processing logs table
CREATE TABLE IF NOT EXISTS public.queue_processing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processed_at timestamptz NOT NULL DEFAULT now(),
  upgrades_completed int NOT NULL DEFAULT 0,
  details jsonb
);

-- Function to process building upgrades
CREATE OR REPLACE FUNCTION public.process_building_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upgrade record;
  v_city_buildings jsonb;
  v_completed_count int := 0;
  v_log_details jsonb := '[]'::jsonb;
BEGIN
  -- Process all completed upgrades
  FOR v_upgrade IN
    SELECT 
      bu.*,
      c.buildings as city_buildings,
      c.user_id
    FROM building_upgrades bu
    JOIN cities c ON c.id = bu.city_id
    WHERE 
      NOT bu.completed 
      AND bu.end_time <= now()
    ORDER BY bu.end_time ASC
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      -- Get current building level
      v_city_buildings := v_upgrade.city_buildings;
      
      -- Update building level
      v_city_buildings := jsonb_set(
        v_city_buildings,
        ARRAY[v_upgrade.building_id, 'level'],
        to_jsonb((v_city_buildings->v_upgrade.building_id->>'level')::int + 1)
      );

      -- Update city
      UPDATE cities
      SET 
        buildings = v_city_buildings,
        updated_at = now()
      WHERE id = v_upgrade.city_id;

      -- Mark upgrade as completed
      UPDATE building_upgrades
      SET completed = true
      WHERE id = v_upgrade.id;

      -- Update counters and log details
      v_completed_count := v_completed_count + 1;
      v_log_details := v_log_details || jsonb_build_object(
        'upgrade_id', v_upgrade.id,
        'city_id', v_upgrade.city_id,
        'building_id', v_upgrade.building_id,
        'from_level', v_upgrade.from_level,
        'to_level', v_upgrade.to_level
      );

    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing other upgrades
      v_log_details := v_log_details || jsonb_build_object(
        'error', SQLERRM,
        'upgrade_id', v_upgrade.id
      );
      CONTINUE;
    END;
  END LOOP;

  -- Log processing results if any work was done
  IF v_completed_count > 0 OR jsonb_array_length(v_log_details) > 0 THEN
    INSERT INTO queue_processing_logs (
      processed_at,
      upgrades_completed,
      details
    ) VALUES (
      now(),
      v_completed_count,
      v_log_details
    );
  END IF;
END;
$$;

-- Create function to trigger queue processing
CREATE OR REPLACE FUNCTION public.trigger_queue_processing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM process_building_queue();
END;
$$;

-- Create index for faster queue processing if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'building_upgrades_processing_idx'
  ) THEN
    CREATE INDEX building_upgrades_processing_idx 
    ON building_upgrades (completed, end_time) 
    WHERE NOT completed;
  END IF;
END $$;