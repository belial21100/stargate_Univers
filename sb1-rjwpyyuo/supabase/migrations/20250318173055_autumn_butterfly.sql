/*
  # Add email field to profiles table

  1. Changes
    - Add email field to profiles table
    - Set email field from auth.users on profile creation
    - Update trigger to include email

  2. Security
    - Email field inherits existing RLS policies
*/

-- Add email column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text UNIQUE;
  END IF;
END $$;

-- Update existing profiles with emails from auth.users
UPDATE profiles
SET email = (
  SELECT email 
  FROM auth.users 
  WHERE auth.users.id = profiles.id
)
WHERE email IS NULL;

-- Update trigger function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;