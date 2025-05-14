-- First, ensure we can drop objects safely
DO $$ 
BEGIN
  -- Drop any existing views that might conflict
  DROP VIEW IF EXISTS users_with_roles_and_permissions CASCADE;
  DROP VIEW IF EXISTS user_permissions_view CASCADE;
  DROP VIEW IF EXISTS user_role_view CASCADE;
  DROP VIEW IF EXISTS users_with_roles_permissions CASCADE;
END $$;

-- Create base view for user roles
CREATE VIEW user_role_view AS
SELECT DISTINCT
  ur.user_id,
  r.id as role_id,
  r.name as role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id;

-- Create base view for user permissions
CREATE VIEW user_permissions_view AS
SELECT DISTINCT
  ur.user_id,
  p.name as permission_name
FROM user_roles ur
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id;

-- Create view for users with roles and permissions
CREATE VIEW users_with_roles_and_permissions AS
SELECT 
  u.id,
  u.email,
  u.created_at,
  urv.role_name,
  array_remove(array_agg(DISTINCT upv.permission_name), NULL) as permissions
FROM auth.users u
LEFT JOIN user_role_view urv ON u.id = urv.user_id
LEFT JOIN user_permissions_view upv ON u.id = upv.user_id
GROUP BY u.id, u.email, u.created_at, urv.role_name;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow read access" ON roles;
  DROP POLICY IF EXISTS "Allow read access" ON permissions;
  DROP POLICY IF EXISTS "Allow read access" ON role_permissions;
  DROP POLICY IF EXISTS "Allow read access" ON user_roles;
  DROP POLICY IF EXISTS "Allow management by admins" ON roles;
  DROP POLICY IF EXISTS "Allow management by admins" ON permissions;
  DROP POLICY IF EXISTS "Allow management by admins" ON role_permissions;
  DROP POLICY IF EXISTS "Allow management by admins" ON user_roles;
END $$;

-- Create simplified read policies
CREATE POLICY "Allow read access"
ON roles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access"
ON permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access"
ON role_permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access"
ON user_roles FOR SELECT
TO authenticated
USING (true);

-- Create simplified management policies
CREATE POLICY "Allow management by admins"
ON roles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_role_view
    WHERE user_id = auth.uid()
    AND role_name IN ('master', 'admin')
  )
);

CREATE POLICY "Allow management by admins"
ON permissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_role_view
    WHERE user_id = auth.uid()
    AND role_name IN ('master', 'admin')
  )
);

CREATE POLICY "Allow management by admins"
ON role_permissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_role_view
    WHERE user_id = auth.uid()
    AND role_name IN ('master', 'admin')
  )
);

CREATE POLICY "Allow management by admins"
ON user_roles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_role_view
    WHERE user_id = auth.uid()
    AND role_name IN ('master', 'admin')
  )
);

-- Ensure master user has correct role
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

  -- If both exist, ensure master role is set
  IF v_user_id IS NOT NULL AND v_master_role_id IS NOT NULL THEN
    -- Remove existing roles first
    DELETE FROM user_roles WHERE user_id = v_user_id;
    
    -- Insert master role
    INSERT INTO user_roles (user_id, role_id)
    VALUES (v_user_id, v_master_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
END $$;