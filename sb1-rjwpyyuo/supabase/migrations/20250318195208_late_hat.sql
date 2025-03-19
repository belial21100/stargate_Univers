/*
  # Fix cities table and data initialization

  1. Changes
    - Drop and recreate cities table with proper constraints
    - Add indexes for better performance
    - Ensure all users have a city
    - Fix data consistency

  2. Security
    - Maintain RLS policies
    - Add proper constraints
*/

-- Recreate cities table with proper constraints
DROP TABLE IF EXISTS public.cities;

CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  naquadah integer NOT NULL DEFAULT 1000 CHECK (naquadah >= 0),
  deuterium integer NOT NULL DEFAULT 500 CHECK (deuterium >= 0),
  trinium integer NOT NULL DEFAULT 200 CHECK (trinium >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX cities_user_id_idx ON public.cities(user_id);

-- Enable RLS
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Users can read own cities"
  ON public.cities
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own cities"
  ON public.cities
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own cities"
  ON public.cities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to create initial city
CREATE OR REPLACE FUNCTION public.create_initial_city()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.cities (
    user_id,
    name,
    naquadah,
    deuterium,
    trinium,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    'Main Base',
    1000,
    500,
    200,
    now(),
    now()
  );
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_initial_city();

-- Create cities for existing users who don't have one
INSERT INTO public.cities (
  user_id,
  name,
  naquadah,
  deuterium,
  trinium,
  created_at,
  updated_at
)
SELECT 
  p.id,
  'Main Base',
  1000,
  500,
  200,
  now(),
  now()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.cities c 
  WHERE c.user_id = p.id
);