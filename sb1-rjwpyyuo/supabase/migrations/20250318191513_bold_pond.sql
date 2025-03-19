/*
  # Add password field to profiles

  1. Changes
    - Add encrypted_password column to profiles table
    - Update handle_new_user function to store password
    - Update register_user function to handle password
*/

-- Add encrypted_password column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'encrypted_password'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN encrypted_password text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    username,
    encrypted_password
  )
  VALUES (
    NEW.id,
    NEW.email,
    split_part(NEW.email, '@', 1),
    NEW.encrypted_password
  );
  RETURN NEW;
END;
$$;

-- Update register_user function
CREATE OR REPLACE FUNCTION public.register_user(
  user_id uuid,
  user_email text,
  username text DEFAULT NULL,
  password text DEFAULT NULL
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
    encrypted_password,
    created_at,
    updated_at,
    last_login
  )
  VALUES (
    user_id,
    user_email,
    COALESCE(username, split_part(user_email, '@', 1)),
    COALESCE(password, ''),
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