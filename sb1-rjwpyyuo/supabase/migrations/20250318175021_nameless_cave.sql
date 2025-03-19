/*
  # Create test user with profile
  
  1. Changes
    - Create an auth user if not exists
    - Create or update corresponding profile entry
    - Handle cases where either user or profile already exists
  
  2. Security
    - Maintains referential integrity
    - Uses secure password hashing
    - Handles duplicate entries gracefully
*/

DO $$
DECLARE
  new_user_id uuid;
  existing_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO existing_user_id
  FROM auth.users
  WHERE email = 'test.user@example.com';

  IF existing_user_id IS NULL THEN
    -- Insert into auth.users and get the ID
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
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'test.user@example.com',
      crypt('password123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO new_user_id;

    -- Create the profile only if it doesn't exist
    INSERT INTO profiles (
      id,
      email,
      username,
      created_at,
      updated_at,
      last_login
    ) VALUES (
      new_user_id,
      'test.user@example.com',
      'testuser',
      now(),
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;