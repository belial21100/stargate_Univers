/*
  # Create test user with specific password

  1. Changes
    - Creates a test user in auth.users with a specific password
    - Profile will be automatically created via trigger
    
  2. Test User Details
    - Email: test@example.com
    - Password: password123
*/

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
      raw_user_meta_data
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
      '{}'
    )
    RETURNING id INTO new_user_id;
  END IF;
END $$;