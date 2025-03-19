/*
  # Fix Research Time Calculation

  1. Changes
    - Fix interval calculation in calculate_research_cost function
    - Ensure proper time scaling for research upgrades
    - Add explicit interval casting

  2. Functions Updated
    - calculate_research_cost
    - start_research
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS calculate_research_cost(text, integer);
DROP FUNCTION IF EXISTS start_research(text);

-- Function to calculate research cost and time
CREATE FUNCTION calculate_research_cost(
  p_research_id TEXT,
  p_current_level INTEGER
)
RETURNS TABLE (
  cost JSONB,
  upgrade_time INTERVAL
) SECURITY DEFINER AS $$
DECLARE
  v_research_type RECORD;
  v_base_cost JSONB;
  v_cost_factor NUMERIC;
  v_base_time INTERVAL;
  v_time_multiplier NUMERIC;
  v_naquadah INTEGER;
  v_deuterium INTEGER;
  v_trinium INTEGER;
  v_seconds INTEGER;
BEGIN
  -- Get research type details
  SELECT * INTO v_research_type
  FROM research_types
  WHERE id = p_research_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Research type not found';
  END IF;

  -- Calculate scaled cost with explicit rounding
  v_base_cost := v_research_type.base_cost;
  v_cost_factor := v_research_type.cost_factor;
  v_base_time := v_research_type.upgrade_time_base;
  v_time_multiplier := POWER(1.1, p_current_level);

  -- Calculate and round each resource cost
  v_naquadah := ROUND((v_base_cost->>'naquadah')::NUMERIC * POWER(v_cost_factor, p_current_level))::INTEGER;
  v_deuterium := ROUND((v_base_cost->>'deuterium')::NUMERIC * POWER(v_cost_factor, p_current_level))::INTEGER;
  v_trinium := ROUND((v_base_cost->>'trinium')::NUMERIC * POWER(v_cost_factor, p_current_level))::INTEGER;

  -- Calculate time in seconds and convert to interval
  v_seconds := ROUND(EXTRACT(EPOCH FROM v_base_time) * v_time_multiplier)::INTEGER;

  -- Return calculated values
  RETURN QUERY
  SELECT 
    jsonb_build_object(
      'naquadah', v_naquadah,
      'deuterium', v_deuterium,
      'trinium', v_trinium
    )::JSONB AS cost,
    (v_seconds * INTERVAL '1 second')::INTERVAL AS upgrade_time;
END;
$$ LANGUAGE plpgsql;

-- Function to start research
CREATE FUNCTION start_research(
  p_research_id TEXT
)
RETURNS JSONB SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_research_type RECORD;
  v_current_level INTEGER;
  v_cost JSONB;
  v_time INTERVAL;
  v_city RECORD;
  v_requirements JSONB;
  v_req_research RECORD;
  v_active_research RECORD;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_naquadah INTEGER;
  v_deuterium INTEGER;
  v_trinium INTEGER;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Get research type
  SELECT * INTO v_research_type
  FROM research_types
  WHERE id = p_research_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Research type not found');
  END IF;

  -- Get current research level
  SELECT level INTO v_current_level
  FROM research_levels
  WHERE user_id = v_user_id AND research_id = p_research_id;

  -- Initialize level to 0 if not found
  IF NOT FOUND THEN
    v_current_level := 0;
  END IF;

  -- Check max level
  IF v_current_level >= v_research_type.max_level THEN
    RETURN jsonb_build_object('success', false, 'message', 'Research already at max level');
  END IF;

  -- Check requirements
  v_requirements := v_research_type.requirements;
  FOR v_req_research IN 
    SELECT r.id, r.name, (v_requirements->>r.id)::INTEGER as required_level
    FROM research_types r
    WHERE v_requirements ? r.id
  LOOP
    SELECT level INTO v_current_level
    FROM research_levels
    WHERE user_id = v_user_id AND research_id = v_req_research.id;

    IF NOT FOUND OR v_current_level < v_req_research.required_level THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', format('Requires %s level %s', v_req_research.name, v_req_research.required_level)
      );
    END IF;
  END LOOP;

  -- Check for active research
  SELECT * INTO v_active_research
  FROM research_queue
  WHERE user_id = v_user_id AND completed = false
  ORDER BY end_time DESC
  LIMIT 1;

  -- Calculate cost and time
  SELECT * INTO v_cost, v_time
  FROM calculate_research_cost(p_research_id, v_current_level);

  IF v_time IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Failed to calculate research time');
  END IF;

  -- Extract costs with explicit casting
  v_naquadah := (v_cost->>'naquadah')::INTEGER;
  v_deuterium := (v_cost->>'deuterium')::INTEGER;
  v_trinium := (v_cost->>'trinium')::INTEGER;

  -- Get user's primary city
  SELECT * INTO v_city
  FROM cities
  WHERE user_id = v_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'No city found');
  END IF;

  -- Check resources
  IF v_city.naquadah < v_naquadah OR
     v_city.deuterium < v_deuterium OR
     v_city.trinium < v_trinium THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient resources');
  END IF;

  -- Deduct resources
  UPDATE cities
  SET
    naquadah = naquadah - v_naquadah,
    deuterium = deuterium - v_deuterium,
    trinium = trinium - v_trinium
  WHERE id = v_city.id;

  -- Set start and end times
  IF v_active_research.id IS NULL THEN
    v_start_time := NOW();
  ELSE
    v_start_time := v_active_research.end_time;
  END IF;
  v_end_time := v_start_time + v_time;

  -- Insert into queue
  INSERT INTO research_queue (
    user_id,
    research_id,
    from_level,
    to_level,
    start_time,
    end_time,
    completed
  ) VALUES (
    v_user_id,
    p_research_id,
    v_current_level,
    v_current_level + 1,
    v_start_time,
    v_end_time,
    false
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Research started',
    'end_time', v_end_time
  );
END;
$$ LANGUAGE plpgsql;