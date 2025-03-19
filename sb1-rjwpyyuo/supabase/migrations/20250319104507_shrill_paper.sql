/*
  # Fix building upgrades and resource handling
  
  1. Changes
    - Add default values for resources in cities table
    - Fix start_building_upgrade function to handle resources properly
    - Add validation for resource values
    
  2. Security
    - Maintain existing RLS policies
    - Add proper error handling
*/

-- Ensure cities have default values for resources
ALTER TABLE public.cities
ALTER COLUMN naquadah SET DEFAULT 1000,
ALTER COLUMN deuterium SET DEFAULT 500,
ALTER COLUMN trinium SET DEFAULT 200;

-- Update any null values in existing cities
UPDATE public.cities
SET 
  naquadah = COALESCE(naquadah, 1000),
  deuterium = COALESCE(deuterium, 500),
  trinium = COALESCE(trinium, 200)
WHERE 
  naquadah IS NULL OR
  deuterium IS NULL OR
  trinium IS NULL;

-- Recreate the start_building_upgrade function with better error handling
CREATE OR REPLACE FUNCTION public.start_building_upgrade(
  p_city_id uuid,
  p_building_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_city cities;
  v_building_type building_types;
  v_current_level integer;
  v_upgrade_cost jsonb;
  v_duration interval;
  v_upgrade_record building_upgrades;
  v_active_upgrades integer;
BEGIN
  -- Check if city belongs to user
  SELECT * INTO v_city
  FROM cities
  WHERE id = p_city_id
  AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'City not found or access denied'
    );
  END IF;

  -- Get building type
  SELECT * INTO v_building_type
  FROM building_types
  WHERE id = p_building_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid building type'
    );
  END IF;

  -- Get current building level
  v_current_level := COALESCE((v_city.buildings->p_building_id->>'level')::integer, 0);

  -- Check max level
  IF v_current_level >= v_building_type.max_level THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Building already at maximum level'
    );
  END IF;

  -- Check active upgrades
  SELECT COUNT(*) INTO v_active_upgrades
  FROM building_upgrades
  WHERE city_id = p_city_id
  AND NOT completed;

  IF v_active_upgrades >= 5 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Maximum number of concurrent upgrades reached'
    );
  END IF;

  -- Calculate costs
  v_upgrade_cost := public.calculate_upgrade_cost(p_building_id, v_current_level);
  v_duration := public.calculate_upgrade_duration(p_building_id, v_current_level);

  -- Check resources
  IF v_city.naquadah < (v_upgrade_cost->>'naquadah')::numeric OR
     v_city.deuterium < (v_upgrade_cost->>'deuterium')::numeric OR
     v_city.trinium < (v_upgrade_cost->>'trinium')::numeric THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Insufficient resources'
    );
  END IF;

  -- Start transaction
  BEGIN
    -- Deduct resources
    UPDATE cities
    SET
      naquadah = GREATEST(0, naquadah - (v_upgrade_cost->>'naquadah')::numeric),
      deuterium = GREATEST(0, deuterium - (v_upgrade_cost->>'deuterium')::numeric),
      trinium = GREATEST(0, trinium - (v_upgrade_cost->>'trinium')::numeric),
      updated_at = now()
    WHERE id = p_city_id;

    -- Create upgrade record
    INSERT INTO building_upgrades (
      city_id,
      building_id,
      from_level,
      to_level,
      start_time,
      end_time
    )
    VALUES (
      p_city_id,
      p_building_id,
      v_current_level,
      v_current_level + 1,
      now(),
      now() + v_duration
    )
    RETURNING * INTO v_upgrade_record;

    -- Return success
    RETURN json_build_object(
      'success', true,
      'message', 'Building upgrade started',
      'upgrade', row_to_json(v_upgrade_record)
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback is automatic
      RETURN json_build_object(
        'success', false,
        'message', 'An error occurred while starting the upgrade'
      );
  END;
END;
$$;