/*
  # Add Research System
  
  1. New Tables
    - `research_types`: Available research technologies
    - `research_levels`: Current research levels for users
    - `research_queue`: Queue for ongoing research
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create research_types table
CREATE TABLE public.research_types (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  base_cost jsonb NOT NULL,
  base_bonus numeric NOT NULL,
  bonus_type text NOT NULL,
  upgrade_time_base interval NOT NULL DEFAULT '1 hour',
  cost_factor numeric NOT NULL DEFAULT 1.5,
  bonus_factor numeric NOT NULL DEFAULT 1.2,
  max_level integer NOT NULL DEFAULT 20,
  requirements jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.research_types ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read research types"
  ON public.research_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Create research_levels table
CREATE TABLE public.research_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  research_id text REFERENCES research_types(id) ON DELETE CASCADE NOT NULL,
  level integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (user_id, research_id)
);

-- Enable RLS
ALTER TABLE public.research_levels ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own research levels"
  ON public.research_levels
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create research_queue table
CREATE TABLE public.research_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  research_id text REFERENCES research_types(id) ON DELETE CASCADE NOT NULL,
  from_level integer NOT NULL,
  to_level integer NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT research_queue_level_check CHECK (to_level > from_level),
  CONSTRAINT research_queue_time_check CHECK (end_time > start_time)
);

-- Enable RLS
ALTER TABLE public.research_queue ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own research queue"
  ON public.research_queue
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX research_levels_user_id_idx ON public.research_levels(user_id);
CREATE INDEX research_queue_user_id_idx ON public.research_queue(user_id);
CREATE INDEX research_queue_end_time_idx ON public.research_queue(end_time) WHERE NOT completed;

-- Insert default research types
INSERT INTO research_types (
  id,
  name,
  description,
  category,
  base_cost,
  base_bonus,
  bonus_type,
  upgrade_time_base,
  cost_factor,
  bonus_factor,
  requirements
) VALUES
  (
    'energy_research',
    'Energy Research',
    'Improves energy efficiency and production of all facilities.',
    'infrastructure',
    '{"naquadah": 800, "deuterium": 400, "trinium": 200}'::jsonb,
    10,
    'energy_production',
    '30 minutes',
    1.5,
    1.2,
    '{}'::jsonb
  ),
  (
    'naquadah_refinement',
    'Naquadah Refinement',
    'Enhances naquadah extraction and processing efficiency.',
    'resources',
    '{"naquadah": 1000, "deuterium": 500, "trinium": 300}'::jsonb,
    15,
    'naquadah_production',
    '45 minutes',
    1.5,
    1.2,
    '{"energy_research": 2}'::jsonb
  ),
  (
    'shield_technology',
    'Shield Technology',
    'Improves shield strength and regeneration for all ships.',
    'defense',
    '{"naquadah": 2000, "deuterium": 1500, "trinium": 1000}'::jsonb,
    10,
    'shield_strength',
    '1 hour',
    1.5,
    1.2,
    '{"energy_research": 3}'::jsonb
  ),
  (
    'weapons_research',
    'Weapons Research',
    'Enhances weapon damage and efficiency.',
    'combat',
    '{"naquadah": 2500, "deuterium": 2000, "trinium": 1500}'::jsonb,
    12,
    'weapon_damage',
    '1 hour 30 minutes',
    1.5,
    1.2,
    '{"energy_research": 4}'::jsonb
  ),
  (
    'hyperspace_physics',
    'Hyperspace Physics',
    'Improves ship speed and reduces travel time.',
    'propulsion',
    '{"naquadah": 3000, "deuterium": 2500, "trinium": 2000}'::jsonb,
    8,
    'travel_speed',
    '2 hours',
    1.5,
    1.2,
    '{"energy_research": 5}'::jsonb
  ),
  (
    'ancient_technology',
    'Ancient Technology',
    'Unlocks advanced Ancient technology applications.',
    'special',
    '{"naquadah": 5000, "deuterium": 4000, "trinium": 3000}'::jsonb,
    20,
    'ancient_bonus',
    '4 hours',
    1.6,
    1.3,
    '{"energy_research": 8, "hyperspace_physics": 5}'::jsonb
  );

-- Function to calculate research duration
CREATE OR REPLACE FUNCTION public.calculate_research_duration(
  p_research_id text,
  p_current_level integer
)
RETURNS interval
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_time interval;
BEGIN
  SELECT upgrade_time_base INTO v_base_time
  FROM research_types
  WHERE id = p_research_id;

  RETURN v_base_time * power(1.5, p_current_level);
END;
$$;

-- Function to calculate research cost
CREATE OR REPLACE FUNCTION public.calculate_research_cost(
  p_research_id text,
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
BEGIN
  SELECT base_cost, cost_factor 
  INTO v_base_cost, v_cost_factor
  FROM research_types
  WHERE id = p_research_id;

  RETURN jsonb_build_object(
    'naquadah', floor((v_base_cost->>'naquadah')::numeric * power(v_cost_factor, p_current_level)),
    'deuterium', floor((v_base_cost->>'deuterium')::numeric * power(v_cost_factor, p_current_level)),
    'trinium', floor((v_base_cost->>'trinium')::numeric * power(v_cost_factor, p_current_level))
  );
END;
$$;

-- Function to check research requirements
CREATE OR REPLACE FUNCTION public.check_research_requirements(
  p_user_id uuid,
  p_research_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requirements jsonb;
  v_req record;
BEGIN
  -- Get research requirements
  SELECT requirements INTO v_requirements
  FROM research_types
  WHERE id = p_research_id;

  -- If no requirements, return true
  IF v_requirements IS NULL OR v_requirements = '{}'::jsonb THEN
    RETURN true;
  END IF;

  -- Check each requirement
  FOR v_req IN 
    SELECT key as research_req, value::text::int as level_req 
    FROM jsonb_each_text(v_requirements)
  LOOP
    IF NOT EXISTS (
      SELECT 1 
      FROM research_levels
      WHERE user_id = p_user_id
      AND research_id = v_req.research_req
      AND level >= v_req.level_req
    ) THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

-- Function to start research
CREATE OR REPLACE FUNCTION public.start_research(
  p_research_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_research research_types;
  v_current_level integer;
  v_research_cost jsonb;
  v_duration interval;
  v_queue_count integer;
  v_city cities;
BEGIN
  -- Get user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Not authenticated'
    );
  END IF;

  -- Get research type
  SELECT * INTO v_research
  FROM research_types
  WHERE id = p_research_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid research type'
    );
  END IF;

  -- Get current research level
  SELECT COALESCE(level, 0) INTO v_current_level
  FROM research_levels
  WHERE user_id = v_user_id AND research_id = p_research_id;

  -- Check max level
  IF v_current_level >= v_research.max_level THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Research already at maximum level'
    );
  END IF;

  -- Check requirements
  IF NOT public.check_research_requirements(v_user_id, p_research_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Research requirements not met'
    );
  END IF;

  -- Check active research count
  SELECT COUNT(*) INTO v_queue_count
  FROM research_queue
  WHERE user_id = v_user_id AND NOT completed;

  IF v_queue_count >= 1 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Another research is already in progress'
    );
  END IF;

  -- Calculate costs and duration
  v_research_cost := public.calculate_research_cost(p_research_id, v_current_level);
  v_duration := public.calculate_research_duration(p_research_id, v_current_level);

  -- Get user's main city for resources
  SELECT * INTO v_city
  FROM cities
  WHERE user_id = v_user_id
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  -- Check resources
  IF v_city.naquadah < (v_research_cost->>'naquadah')::numeric OR
     v_city.deuterium < (v_research_cost->>'deuterium')::numeric OR
     v_city.trinium < (v_research_cost->>'trinium')::numeric THEN
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
      naquadah = GREATEST(0, naquadah - (v_research_cost->>'naquadah')::numeric),
      deuterium = GREATEST(0, deuterium - (v_research_cost->>'deuterium')::numeric),
      trinium = GREATEST(0, trinium - (v_research_cost->>'trinium')::numeric),
      updated_at = now()
    WHERE id = v_city.id;

    -- Insert or update research level
    INSERT INTO research_levels (user_id, research_id, level)
    VALUES (v_user_id, p_research_id, 0)
    ON CONFLICT (user_id, research_id) DO NOTHING;

    -- Create queue entry
    INSERT INTO research_queue (
      user_id,
      research_id,
      from_level,
      to_level,
      start_time,
      end_time
    )
    VALUES (
      v_user_id,
      p_research_id,
      v_current_level,
      v_current_level + 1,
      now(),
      now() + v_duration
    );

    RETURN json_build_object(
      'success', true,
      'message', 'Research started'
    );
  EXCEPTION
    WHEN OTHERS THEN
      RETURN json_build_object(
        'success', false,
        'message', 'An error occurred while starting research'
      );
  END;
END;
$$;

-- Function to process research queue
CREATE OR REPLACE FUNCTION public.process_research_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue record;
BEGIN
  FOR v_queue IN
    SELECT *
    FROM research_queue
    WHERE NOT completed
    AND end_time <= now()
    ORDER BY end_time ASC
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Update research level
    INSERT INTO research_levels (
      user_id,
      research_id,
      level
    )
    VALUES (
      v_queue.user_id,
      v_queue.research_id,
      v_queue.to_level
    )
    ON CONFLICT (user_id, research_id) 
    DO UPDATE SET 
      level = EXCLUDED.level,
      updated_at = now();

    -- Mark queue entry as completed
    UPDATE research_queue
    SET completed = true
    WHERE id = v_queue.id;
  END LOOP;
END;
$$;

-- Schedule queue processing
SELECT cron.schedule(
  'process-research-queue',
  '* * * * *',
  'SELECT public.process_research_queue()'
);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_research_duration TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_research_cost TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_research_requirements TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_research TO authenticated;