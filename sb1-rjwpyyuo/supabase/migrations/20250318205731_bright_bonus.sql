/*
  # Fix profile creation and add recovery

  1. Changes
    - Add function to ensure profiles exist for all users
    - Update register_user function to handle edge cases
    - Add recovery process for missing profiles
    
  2. Security
    - Maintains existing RLS policies
    - Preserves data integrity
*/

-- Function to ensure profile exists
CREATE OR REPLACE FUNCTION public.ensure_profile_exists(
  user_id uuid,
  user_email text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_record profiles;
BEGIN
  -- Check if profile exists
  SELECT * INTO profile_record
  FROM profiles
  WHERE id = user_id;

  -- If profile doesn't exist, create it
  IF profile_record.id IS NULL THEN
    INSERT INTO profiles (
      id,
      email,
      username,
      created_at,
      updated_at,
      last_login,
      encrypted_password
    )
    VALUES (
      user_id,
      user_email,
      split_part(user_email, '@', 1),
      now(),
      now(),
      now(),
      ''
    )
    RETURNING * INTO profile_record;

    -- Create initial city for new profile
    INSERT INTO cities (
      user_id,
      name,
      naquadah,
      deuterium,
      trinium
    )
    VALUES (
      user_id,
      'Main Base',
      1000,
      500,
      200
    );

    RETURN json_build_object(
      'success', true,
      'message', 'Profile created successfully',
      'profile', row_to_json(profile_record)
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Profile already exists',
    'profile', row_to_json(profile_record)
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists TO authenticated;

-- Update register_user function to use ensure_profile_exists
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
  result json;
BEGIN
  -- Ensure profile exists
  result := public.ensure_profile_exists(user_id, user_email);
  
  -- Update username if provided
  IF username IS NOT NULL THEN
    UPDATE profiles
    SET 
      username = COALESCE(username, split_part(user_email, '@', 1)),
      updated_at = now()
    WHERE id = user_id;
  END IF;

  RETURN result;
END;
$$;

-- Recovery: Create profiles for any users that don't have them
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT au.id, au.email
    FROM auth.users au
    LEFT JOIN profiles p ON p.id = au.id
    WHERE p.id IS NULL
  LOOP
    PERFORM public.ensure_profile_exists(user_record.id, user_record.email);
  END LOOP;
END $$;