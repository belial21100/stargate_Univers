/*
  # Fix Profiles Table and Related Objects

  1. Changes
    - Drop existing objects in correct order
    - Create profiles table with proper structure
    - Add RLS policies
    - Create registration function and trigger

  2. Security
    - Enable RLS on profiles table
    - Add policies for authenticated users
    - Secure functions with SECURITY DEFINER
*/

-- First, drop objects in the correct order
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.register_user(uuid, text, text);

-- Drop table and recreate it
DO $$ 
BEGIN
  -- Drop policies if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  END IF;
END $$;

-- Drop and recreate the table
DROP TABLE IF EXISTS public.profiles;

-- Create the profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  username text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create registration function
CREATE OR REPLACE FUNCTION public.register_user(
  user_id uuid,
  user_email text,
  username text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_record profiles;
BEGIN
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE id = user_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Profile already exists'
    );
  END IF;

  -- Insert new profile
  INSERT INTO profiles (
    id,
    email,
    username,
    created_at,
    updated_at,
    last_login
  )
  VALUES (
    user_id,
    user_email,
    COALESCE(username, split_part(user_email, '@', 1)),
    now(),
    now(),
    now()
  )
  RETURNING * INTO profile_record;

  RETURN json_build_object(
    'success', true,
    'profile', row_to_json(profile_record)
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.register_user TO authenticated;

-- Create trigger function for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.register_user(NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();