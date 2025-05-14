-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS create_new_user(text, text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS create_new_user(text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS update_user(uuid, text, text, text, jsonb);

-- Create or replace view for complete user information
CREATE OR REPLACE VIEW user_details_view AS
SELECT 
  u.id,
  u.email,
  u.created_at,
  p.full_name,
  p.contact_info,
  p.status,
  r.name as role,
  COALESCE(array_agg(DISTINCT perm.name) FILTER (WHERE perm.name IS NOT NULL), ARRAY[]::text[]) as permissions
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions perm ON rp.permission_id = perm.id
GROUP BY u.id, u.email, u.created_at, p.full_name, p.contact_info, p.status, r.name;

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
  v_user_id := auth.uid();
  
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_user_with_profile TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile TO authenticated;
GRANT SELECT ON user_details_view TO authenticated;