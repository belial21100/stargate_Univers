/*
  # Add Test Users and Cities

  1. New Users and Cities
    - Creates 5 new test users with profiles
    - Adds cities for each user with random coordinates
    - Sets up buildings with random levels
    - Initializes research levels
  
  2. Data Structure
    - Users get unique email addresses
    - Cities get unique coordinates
    - Buildings have levels between 1-10
    - Research levels vary between 0-5
*/

-- Create function to generate random coordinates that don't conflict with existing ones
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

-- Create test users and their cities
DO $$ 
DECLARE
  new_user_id uuid;
  new_city_id uuid;
  coords record;
  test_users text[] := ARRAY[
    'commander_oneill@sgc.gov',
    'dr_carter@sgc.gov',
    'dr_jackson@sgc.gov',
    'tealc@sgc.gov',
    'general_hammond@sgc.gov'
  ];
  test_usernames text[] := ARRAY[
    'O''Neill',
    'Carter',
    'Jackson',
    'Teal''c',
    'Hammond'
  ];
  i integer;
BEGIN
  FOR i IN 1..array_length(test_users, 1) LOOP
    -- Create auth.users entry
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      test_users[i],
      crypt('SGCommand2025!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      format('{"username":"%s"}', test_usernames[i])::jsonb,
      false
    )
    RETURNING id INTO new_user_id;

    -- Create profile
    INSERT INTO profiles (id, email, username, created_at, updated_at)
    VALUES (
      new_user_id,
      test_users[i],
      test_usernames[i],
      now(),
      now()
    );

    -- Get unique coordinates
    SELECT * FROM generate_unique_coordinates() INTO coords;

    -- Create city with random building levels
    INSERT INTO cities (
      id,
      user_id,
      name,
      naquadah,
      deuterium,
      trinium,
      people,
      x,
      y,
      buildings,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      new_user_id,
      format('%s Base', test_usernames[i]),
      floor(random() * 5000 + 1000),
      floor(random() * 3000 + 500),
      floor(random() * 2000 + 200),
      floor(random() * 5000 + 1000),
      coords.coord_x,
      coords.coord_y,
      jsonb_build_object(
        'naquadah_mine', jsonb_build_object(
          'level', floor(random() * 10 + 1),
          'name', 'Naquadah Mine',
          'production', jsonb_build_object('naquadah', 10)
        ),
        'deuterium_synthesizer', jsonb_build_object(
          'level', floor(random() * 10 + 1),
          'name', 'Deuterium Synthesizer',
          'production', jsonb_build_object('deuterium', 8)
        ),
        'trinium_processor', jsonb_build_object(
          'level', floor(random() * 10 + 1),
          'name', 'Trinium Processor',
          'production', jsonb_build_object('trinium', 5)
        ),
        'house', jsonb_build_object(
          'level', floor(random() * 10 + 1),
          'name', 'Living Quarters',
          'production', jsonb_build_object('people', 2)
        )
      ),
      now(),
      now()
    )
    RETURNING id INTO new_city_id;

    -- Add random research levels
    INSERT INTO research_levels (
      user_id,
      research_id,
      level,
      created_at,
      updated_at
    )
    SELECT
      new_user_id,
      id,
      floor(random() * 6), -- Random level between 0 and 5
      now(),
      now()
    FROM research_types;

  END LOOP;
END $$;

-- Cleanup
DROP FUNCTION generate_unique_coordinates();