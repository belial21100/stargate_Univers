/*
  # Create test user

  1. Changes
    - Create a new auth user with a unique email
    - Add checks to prevent duplicate emails
*/

DO $$
DECLARE
  new_user_id uuid;
  test_email text := 'test2@example.com';
BEGIN
  -- Check if email already exists
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = test_email
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
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      test_email,
      crypt('password123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO new_user_id;
  END IF;
END $$;