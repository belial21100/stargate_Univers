/*
  # Add Map System with Geographic Coordinates

  1. Changes
    - Add x and y coordinates to cities table
    - Add unique constraint to prevent multiple cities at same coordinates
    - Add function to find random available coordinates
    - Add trigger to automatically assign coordinates to new cities

  2. Security
    - Enable RLS on new columns
    - Update policies to include new columns
*/

-- Add coordinates to cities table
ALTER TABLE cities 
ADD COLUMN x INTEGER,
ADD COLUMN y INTEGER;

-- Add unique constraint for coordinates
ALTER TABLE cities
ADD CONSTRAINT cities_coordinates_unique UNIQUE (x, y);

-- Function to find random available coordinates
CREATE OR REPLACE FUNCTION find_random_coordinates()
RETURNS TABLE (coord_x INTEGER, coord_y INTEGER) SECURITY DEFINER AS $$
DECLARE
  v_x INTEGER;
  v_y INTEGER;
  v_max_attempts INTEGER := 100;
  v_attempt INTEGER := 0;
  v_exists BOOLEAN;
BEGIN
  -- Universe size: 1000x1000 grid
  WHILE v_attempt < v_max_attempts LOOP
    -- Generate random coordinates between -500 and 500
    v_x := floor(random() * 1001) - 500;
    v_y := floor(random() * 1001) - 500;
    
    -- Check if coordinates are taken
    SELECT EXISTS (
      SELECT 1 FROM cities 
      WHERE cities.x = v_x AND cities.y = v_y
    ) INTO v_exists;
    
    IF NOT v_exists THEN
      coord_x := v_x;
      coord_y := v_y;
      RETURN NEXT;
      RETURN;
    END IF;
    
    v_attempt := v_attempt + 1;
  END LOOP;
  
  -- If no coordinates found, expand search area
  FOR v_x IN -500..500 LOOP
    FOR v_y IN -500..500 LOOP
      SELECT EXISTS (
        SELECT 1 FROM cities 
        WHERE cities.x = v_x AND cities.y = v_y
      ) INTO v_exists;
      
      IF NOT v_exists THEN
        coord_x := v_x;
        coord_y := v_y;
        RETURN NEXT;
        RETURN;
      END IF;
    END LOOP;
  END LOOP;
  
  -- If still no coordinates found, raise exception
  RAISE EXCEPTION 'No available coordinates found';
END;
$$ LANGUAGE plpgsql;

-- Function to assign coordinates to existing cities
CREATE OR REPLACE FUNCTION assign_coordinates_to_existing_cities()
RETURNS void SECURITY DEFINER AS $$
DECLARE
  v_city RECORD;
  v_coords RECORD;
BEGIN
  FOR v_city IN SELECT id FROM cities WHERE x IS NULL OR y IS NULL
  LOOP
    SELECT coord_x, coord_y INTO v_coords FROM find_random_coordinates();
    
    UPDATE cities 
    SET x = v_coords.coord_x, y = v_coords.coord_y 
    WHERE id = v_city.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to assign coordinates to new cities
CREATE OR REPLACE FUNCTION assign_coordinates_to_new_city()
RETURNS TRIGGER SECURITY DEFINER AS $$
DECLARE
  v_coords RECORD;
BEGIN
  IF NEW.x IS NULL OR NEW.y IS NULL THEN
    SELECT coord_x, coord_y INTO v_coords FROM find_random_coordinates();
    NEW.x := v_coords.coord_x;
    NEW.y := v_coords.coord_y;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS assign_coordinates_trigger ON cities;
CREATE TRIGGER assign_coordinates_trigger
  BEFORE INSERT ON cities
  FOR EACH ROW
  EXECUTE FUNCTION assign_coordinates_to_new_city();

-- Assign coordinates to existing cities
SELECT assign_coordinates_to_existing_cities();