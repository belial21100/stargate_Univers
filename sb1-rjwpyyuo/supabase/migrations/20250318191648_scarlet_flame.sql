/*
  # Create test user with complete profile

  1. Creates a new user in auth.users
  2. Profile will be automatically created via trigger
  3. Includes all required fields and arguments
*/

DO $$
DECLARE
  new_user_id uuid;
  test_email text := 'test3@example.com';
  test_username text := 'testuser3';
  test_password text := 'securepassword123';
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
      crypt(test_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      jsonb_build_object(
        'provider', 'email',
        'providers', array['email']
      ),
      jsonb_build_object(
        'username', test_username
      ),
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO new_user_id;

    -- The profile will be automatically created via the trigger
    -- with all the necessary fields including username and encrypted_password
  END IF;
END $$;