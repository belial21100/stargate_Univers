/*
  # Create register_user function
  
  1. New Function
    - `register_user`: Creates a new user profile
      - Parameters:
        - user_id (uuid)
        - user_email (text)
        - username (text, optional)
  
  2. Security
    - Function runs with SECURITY DEFINER permissions
    - Only authenticated users can execute the function
*/

CREATE OR REPLACE FUNCTION public.register_user(
  user_id uuid,
  user_email text,
  username text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Update the handle_new_user trigger function to use register_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  PERFORM public.register_user(new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;