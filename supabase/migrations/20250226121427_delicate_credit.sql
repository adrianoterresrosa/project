-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS create_user_with_profile(text, text, text, text, text, jsonb);

-- Create simplified function for user creation without password encryption
CREATE OR REPLACE FUNCTION create_user_with_profile(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text,
  p_status text DEFAULT 'active',
  p_contact_info jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_role_id uuid;
BEGIN
  -- Check if caller is a master user
  IF NOT EXISTS (
    SELECT 1 FROM user_roles_view 
    WHERE user_id = auth.uid() 
    AND role_name = 'master'
  ) THEN
    RAISE EXCEPTION 'Only master users can create new users';
  END IF;

  -- Create auth user with temporary password handling
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  ) VALUES (
    p_email,
    -- Store password directly (TEMPORARY SOLUTION - NOT FOR PRODUCTION)
    p_password,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'full_name', p_full_name,
      'status', p_status
    ),
    'authenticated',
    'authenticated'
  ) RETURNING id INTO v_user_id;
  
  -- Create profile
  INSERT INTO profiles (
    id, 
    full_name, 
    status,
    contact_info
  )
  VALUES (
    v_user_id, 
    p_full_name,
    p_status,
    p_contact_info
  );
  
  -- Get role ID
  SELECT id INTO v_role_id
  FROM roles
  WHERE name = p_role;
  
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Invalid role specified';
  END IF;
  
  -- Assign role
  INSERT INTO user_roles (user_id, role_id)
  VALUES (v_user_id, v_role_id);
  
  RETURN v_user_id;
EXCEPTION
  WHEN others THEN
    -- Clean up on error
    IF v_user_id IS NOT NULL THEN
      DELETE FROM auth.users WHERE id = v_user_id;
      DELETE FROM profiles WHERE id = v_user_id;
      DELETE FROM user_roles WHERE user_id = v_user_id;
    END IF;
    RAISE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_user_with_profile TO authenticated;

-- Add warning comment to database
COMMENT ON FUNCTION create_user_with_profile IS 'TEMPORARY SOLUTION: This function stores passwords without encryption. DO NOT USE IN PRODUCTION.';