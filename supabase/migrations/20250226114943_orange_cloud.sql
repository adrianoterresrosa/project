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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_details TO authenticated;