/*
  # Fix database schema and user creation

  1. Changes
    - Drops and recreates profiles table with proper structure
    - Recreates necessary functions and triggers
    - Creates a test user with proper metadata
*/

-- First, drop existing objects in the correct order
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.register_user(uuid, text, text);

-- Drop and recreate the profiles table
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
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    split_part(NEW.email, '@', 1)
  );
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create test user
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Check if user already exists
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'test@example.com'
  ) THEN
    -- Insert into auth.users
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
      confirmation_token,
      email_change_token_current,
      email_change_token_new,
      recovery_token,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmed_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'test@example.com',
      crypt('password123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}',
      '{}',
      false,
      now()
    )
    RETURNING id INTO new_user_id;
  END IF;
END $$;