/*
  # Create Enemy User and Cities

  1. New Data
    - Creates an enemy user account in auth.users
    - Creates enemy profile
    - Sets up research levels at level 5
    - Creates cities with random positions
    - Adds random buildings between levels 5-10

  2. Functions
    - Function to generate random building levels
    - Function to find coordinates near a target position

  3. Security
    - Enemy cities use the same RLS policies as player cities
*/

-- Create enemy user in auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'enemy@sgc.gov',
  crypt('enemy-password', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"username":"Goa''uld Empire"}',
  false,
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Create enemy profile
INSERT INTO profiles (id, email, username, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'enemy@sgc.gov',
  'Goa''uld Empire',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Set up research levels
INSERT INTO research_levels (user_id, research_id, level, created_at, updated_at)
SELECT 
  '00000000-0000-0000-0000-000000000000',
  id,
  5,
  NOW(),
  NOW()
FROM research_types
ON CONFLICT (user_id, research_id) DO UPDATE
SET level = 5;

-- Function to generate random building levels
CREATE OR REPLACE FUNCTION generate_random_buildings()
RETURNS JSONB AS $$
DECLARE
  v_buildings JSONB;
BEGIN
  v_buildings := '{
    "naquadah_mine": {
      "level": 5,
      "name": "Naquadah Mine",
      "description": "Extracts valuable naquadah from the ground",
      "production": {
        "naquadah": 30,
        "deuterium": 0,
        "trinium": 0,
        "people": 0
      },
      "cost": {
        "naquadah": 200,
        "deuterium": 100,
        "trinium": 50
      }
    },
    "deuterium_synthesizer": {
      "level": 5,
      "name": "Deuterium Synthesizer",
      "description": "Produces deuterium from water",
      "production": {
        "naquadah": 0,
        "deuterium": 20,
        "trinium": 0,
        "people": 0
      },
      "cost": {
        "naquadah": 150,
        "deuterium": 75,
        "trinium": 40
      }
    },
    "trinium_processor": {
      "level": 5,
      "name": "Trinium Processor",
      "description": "Refines raw trinium ore",
      "production": {
        "naquadah": 0,
        "deuterium": 0,
        "trinium": 15,
        "people": 0
      },
      "cost": {
        "naquadah": 300,
        "deuterium": 150,
        "trinium": 75
      }
    },
    "house": {
      "level": 5,
      "name": "Living Quarters",
      "description": "Houses your population",
      "production": {
        "naquadah": 0,
        "deuterium": 0,
        "trinium": 0,
        "people": 5
      },
      "cost": {
        "naquadah": 100,
        "deuterium": 50,
        "trinium": 25
      }
    }
  }'::JSONB;

  -- Randomize building levels between 5 and 10
  v_buildings := jsonb_set(v_buildings, '{naquadah_mine,level}', to_jsonb(floor(random() * 6 + 5)::int));
  v_buildings := jsonb_set(v_buildings, '{deuterium_synthesizer,level}', to_jsonb(floor(random() * 6 + 5)::int));
  v_buildings := jsonb_set(v_buildings, '{trinium_processor,level}', to_jsonb(floor(random() * 6 + 5)::int));
  v_buildings := jsonb_set(v_buildings, '{house,level}', to_jsonb(floor(random() * 6 + 5)::int));

  RETURN v_buildings;
END;
$$ LANGUAGE plpgsql;

-- Function to find coordinates near a target position
CREATE OR REPLACE FUNCTION find_coordinates_near_target(
  target_x INTEGER,
  target_y INTEGER,
  max_distance INTEGER DEFAULT 50
)
RETURNS TABLE (coord_x INTEGER, coord_y INTEGER) AS $$
DECLARE
  v_x INTEGER;
  v_y INTEGER;
  v_distance INTEGER;
  v_angle FLOAT;
  v_exists BOOLEAN;
  v_attempts INTEGER := 0;
BEGIN
  WHILE v_attempts < 100 LOOP
    -- Generate random angle and distance
    v_angle := random() * 2 * pi();
    v_distance := floor(random() * max_distance + 10)::INTEGER; -- Minimum 10 units away
    
    -- Calculate coordinates
    v_x := target_x + floor(cos(v_angle) * v_distance)::INTEGER;
    v_y := target_y + floor(sin(v_angle) * v_distance)::INTEGER;
    
    -- Ensure coordinates are within bounds (-500 to 500)
    v_x := GREATEST(-500, LEAST(500, v_x));
    v_y := GREATEST(-500, LEAST(500, v_y));
    
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
    
    v_attempts := v_attempts + 1;
  END LOOP;
  
  -- If no coordinates found, try a larger area
  RETURN QUERY SELECT * FROM find_random_coordinates() LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create enemy cities near players
DO $$
DECLARE
  v_player_city RECORD;
  v_coords RECORD;
  v_city_number INTEGER;
  v_buildings JSONB;
BEGIN
  -- For each player city
  FOR v_player_city IN 
    SELECT DISTINCT x, y 
    FROM cities 
    WHERE user_id != '00000000-0000-0000-0000-000000000000'
    AND x IS NOT NULL 
    AND y IS NOT NULL
  LOOP
    -- Create 2 enemy cities near this player city
    FOR v_city_number IN 1..2 LOOP
      -- Find coordinates near player city
      SELECT coord_x, coord_y INTO v_coords 
      FROM find_coordinates_near_target(v_player_city.x, v_player_city.y);
      
      -- Generate random buildings
      v_buildings := generate_random_buildings();
      
      -- Create enemy city
      INSERT INTO cities (
        user_id,
        name,
        naquadah,
        deuterium,
        trinium,
        people,
        buildings,
        x,
        y,
        created_at,
        updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        'Ha''tak Base ' || v_city_number,
        5000,  -- Starting resources
        2500,
        1000,
        1000,
        v_buildings,
        v_coords.coord_x,
        v_coords.coord_y,
        NOW(),
        NOW()
      );
    END LOOP;
  END LOOP;
END;
$$;