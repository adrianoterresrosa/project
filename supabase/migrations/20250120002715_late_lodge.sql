-- Get user ID and master role ID
DO $$ 
DECLARE
  v_user_id uuid;
  v_master_role_id uuid;
BEGIN
  -- Get user ID by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'adrianoterresrosa@gmail.com';

  -- Get master role ID
  SELECT id INTO v_master_role_id
  FROM roles
  WHERE name = 'master';

  -- If both user and role exist, set the master role
  IF v_user_id IS NOT NULL AND v_master_role_id IS NOT NULL THEN
    -- First, remove any existing roles for the user to avoid conflicts
    DELETE FROM user_roles WHERE user_id = v_user_id;
    
    -- Then, assign the master role
    INSERT INTO user_roles (user_id, role_id)
    VALUES (v_user_id, v_master_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    -- Refresh the permissions materialized view
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_permissions;
  END IF;
END $$;

-- Verify the user has the master role
DO $$
DECLARE
  v_has_master boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    JOIN auth.users u ON ur.user_id = u.id
    WHERE u.email = 'adrianoterresrosa@gmail.com'
    AND r.name = 'master'
  ) INTO v_has_master;

  IF NOT v_has_master THEN
    RAISE EXCEPTION 'Failed to set master role for user';
  END IF;
END $$;