/*
  # Add cities table for player resources

  1. New Tables
    - `cities`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `name` (text)
      - `naquadah` (integer)
      - `deuterium` (integer)
      - `trinium` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for authenticated users to:
      - Read their own cities
      - Update their own cities
*/

-- Create cities table
CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  naquadah integer DEFAULT 1000,
  deuterium integer DEFAULT 500,
  trinium integer DEFAULT 200,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Function to create initial city for new users
CREATE OR REPLACE FUNCTION public.create_initial_city()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.cities (user_id, name)
  VALUES (NEW.id, 'Main Base');
  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_initial_city();