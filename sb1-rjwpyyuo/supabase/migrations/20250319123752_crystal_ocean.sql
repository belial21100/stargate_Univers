/*
  # Fix Research Queue Processing

  1. Changes
    - Add process_research_queue function with proper level updates
    - Add cron job to run the processing function
    - Ensure proper completion handling

  2. Functions Updated
    - process_research_queue
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS process_research_queue();

-- Function to process research queue
CREATE FUNCTION process_research_queue() 
RETURNS void SECURITY DEFINER AS $$
DECLARE
  v_research RECORD;
  v_current_level INTEGER;
BEGIN
  -- Get completed research
  FOR v_research IN
    SELECT rq.*
    FROM research_queue rq
    WHERE rq.completed = false 
    AND rq.end_time <= NOW()
    ORDER BY rq.end_time ASC
  LOOP
    -- Get current level
    SELECT level INTO v_current_level
    FROM research_levels
    WHERE user_id = v_research.user_id 
    AND research_id = v_research.research_id;

    -- Insert or update research level
    INSERT INTO research_levels (
      user_id,
      research_id,
      level,
      created_at,
      updated_at
    ) VALUES (
      v_research.user_id,
      v_research.research_id,
      COALESCE(v_current_level, 0) + 1,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, research_id) 
    DO UPDATE SET 
      level = EXCLUDED.level,
      updated_at = NOW();

    -- Mark as completed
    UPDATE research_queue
    SET 
      completed = true,
      updated_at = NOW()
    WHERE id = v_research.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Drop existing cron job if it exists
SELECT cron.unschedule('process-research-queue');

-- Create cron job to process research queue every 10 seconds
SELECT cron.schedule(
  'process-research-queue',
  '*/10 * * * * *',  -- Every 10 seconds
  $$SELECT process_research_queue()$$
);