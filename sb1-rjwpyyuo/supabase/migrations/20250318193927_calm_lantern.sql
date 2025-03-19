/*
  # Add cities for existing users

  1. Changes
    - Creates a city for each user that doesn't have one yet
    - Uses default resource values:
      - Naquadah: 1000
      - Deuterium: 500
      - Trinium: 200
    
  2. Security
    - Maintains existing RLS policies
    - Preserves referential integrity
*/

-- Insert cities for users who don't have any
INSERT INTO public.cities (user_id, name, naquadah, deuterium, trinium)
SELECT 
  profiles.id,
  'Main Base',
  1000,  -- Default naquadah
  500,   -- Default deuterium
  200    -- Default trinium
FROM public.profiles
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.cities 
  WHERE cities.user_id = profiles.id
);

-- Update the timestamps for newly created cities
UPDATE public.cities
SET 
  created_at = now(),
  updated_at = now()
WHERE created_at IS NULL;