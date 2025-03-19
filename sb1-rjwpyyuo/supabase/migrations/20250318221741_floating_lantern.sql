/*
  # Add building queue system

  1. New Tables
    - `building_queue`
      - `id` (uuid, primary key)
      - `city_id` (uuid, references cities)
      - `building_id` (text)
      - `start_time` (timestamp)
      - `end_time` (timestamp)
      - `created_at` (timestamp)
      - `completed` (boolean)

  2. Functions
    - Add function to process building queue
    - Add function to add building to queue
    - Add function to check and complete queued buildings

  3. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create building queue table
CREATE TABLE public.building_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id uuid REFERENCES public.cities(id) ON DELETE CASCADE NOT NULL,
  building_id text NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed boolean NOT NULL DEFAULT false,
  
  -- Ensure end_time is after start_time
  CONSTRAINT building_queue_time_check CHECK (end_time > start_time)
);

-- Create index for faster queries
CREATE INDEX building_queue_city_id_idx ON public.building_queue(city_id);
CREATE INDEX building_queue_end_time_idx ON public.building_queue(end_time) WHERE NOT completed;

-- Enable RLS
ALTER TABLE public.building_queue ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own building queue"
  ON public.building_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cities
      WHERE cities.id = building_queue.city_id
      AND cities.user_id = auth.uid()
    )
  );

-- Function to add building to queue
CREATE OR REPLACE FUNCTION public.add_to_building_queue(
  p_city_id uuid,
  p_building_id text,
  p_duration interval
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_city cities;
  v_queue_count int;
  v_start_time timestamptz;
  v_end_time timestamptz;
  v_queue_record building_queue;
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

  -- Get count of active queue items
  SELECT COUNT(*) INTO v_queue_count
  FROM building_queue
  WHERE city_id = p_city_id
  AND NOT completed;

  -- Get the latest end_time from queue or current time
  SELECT COALESCE(MAX(end_time), now())
  INTO v_start_time
  FROM building_queue
  WHERE city_id = p_city_id
  AND NOT completed;

  -- Calculate end time
  v_end_time := v_start_time + p_duration;

  -- Insert new queue item
  INSERT INTO building_queue (
    city_id,
    building_id,
    start_time,
    end_time
  )
  VALUES (
    p_city_id,
    p_building_id,
    v_start_time,
    v_end_time
  )
  RETURNING * INTO v_queue_record;

  RETURN json_build_object(
    'success', true,
    'queue_item', row_to_json(v_queue_record)
  );
END;
$$;

-- Function to process completed queue items
CREATE OR REPLACE FUNCTION public.process_building_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_record building_queue;
  v_city_buildings jsonb;
  v_building_level int;
BEGIN
  -- Get completed but unprocessed queue items
  FOR v_queue_record IN
    SELECT *
    FROM building_queue
    WHERE NOT completed
    AND end_time <= now()
    ORDER BY end_time ASC
    FOR UPDATE
  LOOP
    -- Get current building level
    SELECT buildings->v_queue_record.building_id->>'level'
    INTO v_building_level
    FROM cities
    WHERE id = v_queue_record.city_id;

    -- Update building level
    UPDATE cities
    SET buildings = jsonb_set(
      buildings,
      ARRAY[v_queue_record.building_id, 'level'],
      to_jsonb(v_building_level + 1)
    )
    WHERE id = v_queue_record.city_id;

    -- Mark queue item as completed
    UPDATE building_queue
    SET completed = true
    WHERE id = v_queue_record.id;
  END LOOP;
END;
$$;

-- Schedule queue processing
SELECT cron.schedule(
  'process-building-queue',
  '* * * * *',  -- Every minute
  $$
  SELECT public.process_building_queue();
  $$
);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.add_to_building_queue TO authenticated;