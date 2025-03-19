/*
  # Add building upgrade system
  
  1. New Tables
    - `building_types`
      - Stores building configurations and base stats
    - `building_levels`
      - Stores level-specific requirements and stats
    - `building_upgrades`
      - Tracks ongoing building upgrades
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create building_types table
CREATE TABLE public.building_types (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  base_cost jsonb NOT NULL,
  base_production jsonb NOT NULL,
  upgrade_time_base interval NOT NULL DEFAULT '1 hour',
  cost_factor numeric NOT NULL DEFAULT 1.5,
  production_factor numeric NOT NULL DEFAULT 1.2,
  max_level integer NOT NULL DEFAULT 100,
  requirements jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.building_types ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read building types"
  ON public.building_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Create building_upgrades table
CREATE TABLE public.building_upgrades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid REFERENCES public.cities(id) ON DELETE CASCADE NOT NULL,
  building_id text NOT NULL,
  from_level integer NOT NULL,
  to_level integer NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  
  CONSTRAINT building_upgrades_level_check CHECK (to_level > from_level),
  CONSTRAINT building_upgrades_time_check CHECK (end_time > start_time)
);

-- Create indexes
CREATE INDEX building_upgrades_city_id_idx ON public.building_upgrades(city_id);
CREATE INDEX building_upgrades_end_time_idx ON public.building_upgrades(end_time) WHERE NOT completed;

-- Enable RLS
ALTER TABLE public.building_upgrades ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own building upgrades"
  ON public.building_upgrades
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cities
      WHERE cities.id = building_upgrades.city_id
      AND cities.user_id = auth.uid()
    )
  );

-- Function to calculate upgrade duration
CREATE OR REPLACE FUNCTION public.calculate_upgrade_duration(
  p_building_id text,
  p_current_level integer
)
RETURNS interval
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_time interval;
  v_duration interval;
BEGIN
  -- Get base upgrade time
  SELECT upgrade_time_base INTO v_base_time
  FROM building_types
  WHERE id = p_building_id;

  -- Calculate duration (increases with level)
  v_duration := v_base_time * power(1.5, p_current_level);
  
  RETURN v_duration;
END;
$$;

-- Function to calculate upgrade cost
CREATE OR REPLACE FUNCTION public.calculate_upgrade_cost(
  p_building_id text,
  p_current_level integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_cost jsonb;
  v_cost_factor numeric;
  v_final_cost jsonb;
BEGIN
  -- Get base cost and factor
  SELECT base_cost, cost_factor INTO v_base_cost, v_cost_factor
  FROM building_types
  WHERE id = p_building_id;

  -- Calculate cost for next level
  v_final_cost := jsonb_build_object(
    'naquadah', floor((v_base_cost->>'naquadah')::numeric * power(v_cost_factor, p_current_level)),
    'deuterium', floor((v_base_cost->>'deuterium')::numeric * power(v_cost_factor, p_current_level)),
    'trinium', floor((v_base_cost->>'trinium')::numeric * power(v_cost_factor, p_current_level))
  );
  
  RETURN v_final_cost;
END;
$$;

-- Function to start building upgrade
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
  v_current_level := (v_city.buildings->p_building_id->>'level')::integer;

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

  -- Deduct resources
  UPDATE cities
  SET
    naquadah = naquadah - (v_upgrade_cost->>'naquadah')::numeric,
    deuterium = deuterium - (v_upgrade_cost->>'deuterium')::numeric,
    trinium = trinium - (v_upgrade_cost->>'trinium')::numeric
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

  RETURN json_build_object(
    'success', true,
    'message', 'Building upgrade started',
    'upgrade', row_to_json(v_upgrade_record)
  );
END;
$$;

-- Function to process completed upgrades
CREATE OR REPLACE FUNCTION public.process_building_upgrades()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upgrade record;
BEGIN
  FOR v_upgrade IN
    SELECT *
    FROM building_upgrades
    WHERE NOT completed
    AND end_time <= now()
    ORDER BY end_time ASC
    FOR UPDATE
  LOOP
    -- Update building level
    UPDATE cities
    SET buildings = jsonb_set(
      buildings,
      ARRAY[v_upgrade.building_id, 'level'],
      to_jsonb(v_upgrade.to_level)
    )
    WHERE id = v_upgrade.city_id;

    -- Mark upgrade as completed
    UPDATE building_upgrades
    SET completed = true
    WHERE id = v_upgrade.id;
  END LOOP;
END;
$$;

-- Schedule upgrade processing
SELECT cron.schedule(
  'process-building-upgrades',
  '* * * * *',  -- Every minute
  $$
  SELECT public.process_building_upgrades();
  $$
);

-- Insert default building types
INSERT INTO building_types (
  id,
  name,
  description,
  base_cost,
  base_production,
  upgrade_time_base,
  cost_factor,
  production_factor
) VALUES
  (
    'naquadah_mine',
    'Naquadah Mine',
    'Deep underground facility extracting precious Naquadah, the foundation of advanced Stargate technology.',
    '{"naquadah": 200, "deuterium": 100, "trinium": 50}'::jsonb,
    '{"naquadah": 10, "deuterium": 0, "trinium": 0, "people": 0}'::jsonb,
    '30 minutes',
    1.5,
    1.2
  ),
  (
    'deuterium_synthesizer',
    'Deuterium Synthesizer',
    'Advanced facility that extracts and processes Deuterium for powering ships and weapons.',
    '{"naquadah": 150, "deuterium": 50, "trinium": 25}'::jsonb,
    '{"naquadah": 0, "deuterium": 5, "trinium": 0, "people": 0}'::jsonb,
    '20 minutes',
    1.5,
    1.2
  ),
  (
    'trinium_processor',
    'Trinium Processor',
    'Specialized facility that refines raw Trinium ore into its super-strong alloy form.',
    '{"naquadah": 300, "deuterium": 150, "trinium": 75}'::jsonb,
    '{"naquadah": 0, "deuterium": 0, "trinium": 3, "people": 0}'::jsonb,
    '40 minutes',
    1.5,
    1.2
  ),
  (
    'zpm_facility',
    'ZPM Research Facility',
    'Advanced Ancient facility studying Zero Point Modules, providing bonus resources from subspace energy.',
    '{"naquadah": 500, "deuterium": 250, "trinium": 100}'::jsonb,
    '{"naquadah": 15, "deuterium": 8, "trinium": 4, "people": 0}'::jsonb,
    '1 hour',
    1.5,
    1.2
  ),
  (
    'gate_room',
    'Gate Room',
    'The heart of your base, housing a Stargate. Higher levels enable more efficient resource trading through the gate network.',
    '{"naquadah": 1000, "deuterium": 500, "trinium": 200}'::jsonb,
    '{"naquadah": 20, "deuterium": 10, "trinium": 5, "people": 0}'::jsonb,
    '2 hours',
    1.5,
    1.2
  ),
  (
    'ancient_outpost',
    'Ancient Outpost',
    'A discovered Ancient facility with advanced technology, providing significant resource generation.',
    '{"naquadah": 2000, "deuterium": 1000, "trinium": 400}'::jsonb,
    '{"naquadah": 30, "deuterium": 15, "trinium": 8, "people": 0}'::jsonb,
    '4 hours',
    1.5,
    1.2
  ),
  (
    'asgard_core',
    'Asgard Core',
    'Repository of Asgard knowledge and technology, significantly boosting all resource production.',
    '{"naquadah": 3000, "deuterium": 1500, "trinium": 600}'::jsonb,
    '{"naquadah": 40, "deuterium": 20, "trinium": 10, "people": 0}'::jsonb,
    '6 hours',
    1.5,
    1.2
  ),
  (
    'house',
    'House',
    'Residential building that provides housing for your population.',
    '{"naquadah": 100, "deuterium": 50, "trinium": 25}'::jsonb,
    '{"naquadah": 0, "deuterium": 0, "trinium": 0, "people": 100}'::jsonb,
    '15 minutes',
    1.5,
    1.2
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_upgrade_duration TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_upgrade_cost TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_building_upgrade TO authenticated;