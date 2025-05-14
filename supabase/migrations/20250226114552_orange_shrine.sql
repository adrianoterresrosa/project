-- Drop existing functions
DROP FUNCTION IF EXISTS create_user_with_profile(text, text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS update_user_profile(uuid, text, text, text, jsonb);

-- Create function to create new user with all information
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

  -- Create auth user
  INSERT INTO auth.users (
    email,
    raw_user_meta_data,
    encrypted_password
  ) VALUES (
    p_email,
    jsonb_build_object(
      'full_name', p_full_name,
      'status', p_status
    ),
    crypt(p_password, gen_salt('bf'))
  ) RETURNING id INTO v_user_id;
  
  -- Create profile with all information
  INSERT INTO profiles (
    id, 
    full_name, 
    status,
    contact_info,
    metadata,
    settings
  )
  VALUES (
    v_user_id, 
    p_full_name,
    p_status,
    p_contact_info,
    '{}'::jsonb,
    '{
      "theme": "light",
      "language": "pt-BR",
      "notifications": {
        "email": true,
        "push": false
      }
    }'::jsonb
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

-- Create function to update user with all information
CREATE OR REPLACE FUNCTION update_user_profile(
  p_user_id uuid,
  p_full_name text,
  p_role text,
  p_status text,
  p_contact_info jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id uuid;
BEGIN
  -- Check if caller is a master user
  IF NOT EXISTS (
    SELECT 1 FROM user_roles_view 
    WHERE user_id = auth.uid() 
    AND role_name = 'master'
  ) THEN
    RAISE EXCEPTION 'Only master users can update users';
  END IF;

  -- Update auth user metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'full_name', p_full_name,
    'status', p_status
  )
  WHERE id = p_user_id;

  -- Update profile
  UPDATE profiles 
  SET 
    full_name = p_full_name,
    status = p_status,
    contact_info = p_contact_info,
    updated_at = now()
  WHERE id = p_user_id;

  -- Get role ID
  SELECT id INTO v_role_id
  FROM roles
  WHERE name = p_role;
  
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Invalid role specified';
  END IF;

  -- Update role
  UPDATE user_roles
  SET role_id = v_role_id
  WHERE user_id = p_user_id;
END;
$$;

-- Create function to safely delete users
CREATE OR REPLACE FUNCTION delete_user_safely(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is a master user
  IF NOT EXISTS (
    SELECT 1 FROM user_roles_view 
    WHERE user_id = auth.uid() 
    AND role_name = 'master'
  ) THEN
    RAISE EXCEPTION 'Only master users can delete users';
  END IF;

  -- Check if trying to delete a master user
  IF EXISTS (
    SELECT 1 FROM user_roles_view
    WHERE user_id = p_user_id
    AND role_name = 'master'
  ) THEN
    RAISE EXCEPTION 'Cannot delete master users';
  END IF;

  -- Delete user roles first
  DELETE FROM user_roles WHERE user_id = p_user_id;
  
  -- Delete profile
  DELETE FROM profiles WHERE id = p_user_id;
  
  -- Finally delete auth user
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_user_with_profile TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_safely TO authenticated;