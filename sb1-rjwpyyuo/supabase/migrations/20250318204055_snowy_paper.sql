/*
  # Log off all user sessions

  1. Changes
    - Invalidate all existing user sessions
    - Reset session-related fields
    - Force all users to log in again
    
  2. Security
    - Maintains existing RLS policies
    - Preserves user data and profiles
*/

-- Invalidate all sessions by updating the last_sign_in_at timestamp
UPDATE auth.users
SET 
  last_sign_in_at = now(),
  updated_at = now(),
  raw_app_meta_data = raw_app_meta_data || '{"session_invalidated": true}'::jsonb;

-- Delete all existing sessions
DELETE FROM auth.sessions;

-- Reset any active refresh tokens
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data - 'refresh_token';