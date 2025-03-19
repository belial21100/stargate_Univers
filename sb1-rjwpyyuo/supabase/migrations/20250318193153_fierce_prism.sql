/*
  # Fix email confirmation for users

  1. Changes
    - Update existing users to be confirmed via email_confirmed_at
    - Create function to automatically confirm new users
    - Avoid modifying generated columns
*/

-- Update existing users to be confirmed
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
    last_sign_in_at = COALESCE(last_sign_in_at, now()),
    updated_at = now()
WHERE email_confirmed_at IS NULL;

-- Ensure the handle_new_user trigger sets confirmation
CREATE OR REPLACE FUNCTION auth.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set confirmation fields
  NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, now());
  NEW.last_sign_in_at := COALESCE(NEW.last_sign_in_at, now());
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.handle_new_user();