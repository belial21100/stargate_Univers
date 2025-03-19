/*
  # Add Coordinates to Cities

  1. Changes
    - Add coordinates to any cities missing them
    - Ensure coordinates are unique
    - Keep existing coordinates if present
*/

-- Create temporary function to generate unique coordinates
CREATE OR REPLACE FUNCTION generate_unique_coordinates()
RETURNS TABLE (coord_x integer, coord_y integer) AS $$
DECLARE
  max_attempts integer := 100;
  current_attempt integer := 0;
  candidate_x integer;
  candidate_y integer;
  coordinates_exist boolean;
BEGIN
  LOOP
    EXIT WHEN current_attempt >= max_attempts;
    
    -- Generate random coordinates between -50 and 50
    candidate_x := floor(random() * 101) - 50;
    candidate_y := floor(random() * 101) - 50;
    
    -- Check if coordinates are already taken
    SELECT EXISTS (
      SELECT 1 FROM cities c WHERE c.x = candidate_x AND c.y = candidate_y
    ) INTO coordinates_exist;
    
    IF NOT coordinates_exist THEN
      coord_x := candidate_x;
      coord_y := candidate_y;
      RETURN NEXT;
      RETURN;
    END IF;
    
    current_attempt := current_attempt + 1;
  END LOOP;
  
  -- If we couldn't find unique coordinates, return null
  coord_x := NULL;
  coord_y := NULL;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Update cities without coordinates
DO $$
DECLARE
  city_record record;
  new_coords record;
BEGIN
  FOR city_record IN 
    SELECT id FROM cities 
    WHERE x IS NULL OR y IS NULL
  LOOP
    SELECT * FROM generate_unique_coordinates() INTO new_coords;
    
    IF new_coords.coord_x IS NOT NULL AND new_coords.coord_y IS NOT NULL THEN
      UPDATE cities 
      SET 
        x = new_coords.coord_x,
        y = new_coords.coord_y,
        updated_at = now()
      WHERE id = city_record.id;
    END IF;
  END LOOP;
END $$;

-- Cleanup
DROP FUNCTION generate_unique_coordinates();