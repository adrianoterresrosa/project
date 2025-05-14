-- Ensure master user has correct role and permissions
DO $$ 
DECLARE
  v_user_id uuid;
  v_master_role_id uuid;
  v_master_exists boolean;
BEGIN
  -- Get user ID by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'adrianoterresrosa@gmail.com';

  -- Get master role ID
  SELECT id INTO v_master_role_id
  FROM roles
  WHERE name = 'master';

  -- Check if user already has master role
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = v_user_id
    AND r.name = 'master'
  ) INTO v_master_exists;

  -- If user exists but doesn't have master role, set it
  IF v_user_id IS NOT NULL AND v_master_role_id IS NOT NULL AND NOT v_master_exists THEN
    -- Remove any existing roles
    DELETE FROM user_roles WHERE user_id = v_user_id;
    
    -- Insert master role
    INSERT INTO user_roles (user_id, role_id)
    VALUES (v_user_id, v_master_role_id);

    -- Assign all permissions to master role if not already assigned
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_master_role_id, p.id
    FROM permissions p
    WHERE NOT EXISTS (
      SELECT 1 FROM role_permissions
      WHERE role_id = v_master_role_id
      AND permission_id = p.id
    );
  END IF;

  -- Verify master role was set correctly
  IF NOT EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = v_user_id
    AND r.name = 'master'
  ) THEN
    RAISE EXCEPTION 'Failed to set master role for user';
  END IF;

  -- Verify all permissions are assigned
  IF EXISTS (
    SELECT 1 FROM permissions p
    WHERE NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = v_master_role_id
      AND rp.permission_id = p.id
    )
  ) THEN
    RAISE EXCEPTION 'Failed to assign all permissions to master role';
  END IF;
END $$;