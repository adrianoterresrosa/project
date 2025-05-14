-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON roles;
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON permissions;
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON role_permissions;
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON user_roles;
DROP POLICY IF EXISTS "Allow management by master users" ON roles;
DROP POLICY IF EXISTS "Allow management by master users" ON permissions;
DROP POLICY IF EXISTS "Allow management by master users" ON role_permissions;
DROP POLICY IF EXISTS "Allow management by master users" ON user_roles;

-- Create simplified read policies
CREATE POLICY "Enable read for authenticated users"
ON roles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable read for authenticated users"
ON permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable read for authenticated users"
ON role_permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable read for authenticated users"
ON user_roles FOR SELECT
TO authenticated
USING (true);

-- Create simplified management policies for master users
CREATE POLICY "Enable management for master users"
ON roles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role_id IN (SELECT id FROM roles WHERE name = 'master')
  )
);

CREATE POLICY "Enable management for master users"
ON permissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role_id IN (SELECT id FROM roles WHERE name = 'master')
  )
);

CREATE POLICY "Enable management for master users"
ON role_permissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role_id IN (SELECT id FROM roles WHERE name = 'master')
  )
);

CREATE POLICY "Enable management for master users"
ON user_roles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role_id IN (SELECT id FROM roles WHERE name = 'master')
  )
);

-- Drop and recreate views to avoid recursion
DROP VIEW IF EXISTS user_role_view CASCADE;
DROP VIEW IF EXISTS user_permissions_view CASCADE;

-- Create optimized views
CREATE VIEW user_role_view AS
SELECT DISTINCT
  ur.user_id,
  r.id as role_id,
  r.name as role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id;

CREATE VIEW user_permissions_view AS
SELECT DISTINCT
  ur.user_id,
  p.name as permission_name
FROM user_roles ur
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id;