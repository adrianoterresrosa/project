-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create trigger function to sync user status
CREATE OR REPLACE FUNCTION sync_user_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{status}',
      to_jsonb(NEW.status)
    )
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS sync_user_status_trigger ON profiles;
CREATE TRIGGER sync_user_status_trigger
  AFTER UPDATE OF status ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_status();

-- Create function to get user details
CREATE OR REPLACE FUNCTION get_user_details(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  status text,
  contact_info jsonb,
  created_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller has permission to view user details
  IF NOT EXISTS (
    SELECT 1 FROM user_roles_view 
    WHERE user_id = auth.uid() 
    AND (role_name = 'master' OR auth.uid() = p_user_id)
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    p.full_name,
    r.name as role,
    p.status,
    p.contact_info,
    u.created_at
  FROM auth.users u
  LEFT JOIN profiles p ON u.id = p.id
  LEFT JOIN user_roles ur ON u.id = ur.user_id
  LEFT JOIN roles r ON ur.role_id = r.id
  WHERE u.id = p_user_id;
END;
$$;

-- Create function to safely delete user
CREATE OR REPLACE FUNCTION delete_user_safely(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
  v_caller_role text;
BEGIN
  -- Get user's role
  SELECT r.name INTO v_user_role
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id;

  -- Get caller's role
  SELECT r.name INTO v_caller_role
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = auth.uid();

  -- Only master users can delete other users
  IF v_caller_role != 'master' THEN
    RAISE EXCEPTION 'Only master users can delete users';
  END IF;

  -- Prevent deletion of master users
  IF v_user_role = 'master' THEN
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

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION check_user_permission(p_permission text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_permissions_view
    WHERE user_id = auth.uid()
    AND permission_name = p_permission
  );
END;
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT r.name INTO v_role
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = auth.uid();
  
  RETURN v_role;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_details TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_safely TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_permission TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role TO authenticated;