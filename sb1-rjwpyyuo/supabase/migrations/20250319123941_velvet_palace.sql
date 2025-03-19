/*
  # Set Minimum Research Time

  1. Changes
    - Add minimum research time of 1 second
    - Ensure research time never goes below 1 second
    - Update time calculation logic

  2. Functions Updated
    - calculate_research_cost
*/

-- Drop existing function
DROP FUNCTION IF EXISTS calculate_research_cost(text, integer);

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

  -- Calculate time in seconds and ensure minimum of 1 second
  v_seconds := GREATEST(1, ROUND(EXTRACT(EPOCH FROM v_base_time) * v_time_multiplier)::INTEGER);

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