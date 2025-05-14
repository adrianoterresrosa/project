-- Drop existing policies and views
DROP POLICY IF EXISTS "Enable read for authenticated users" ON roles;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON permissions;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON role_permissions;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON user_roles;
DROP POLICY IF EXISTS "Enable management for master users" ON roles;
DROP POLICY IF EXISTS "Enable management for master users" ON permissions;
DROP POLICY IF EXISTS "Enable management for master users" ON role_permissions;
DROP POLICY IF EXISTS "Enable management for master users" ON user_roles;

DROP VIEW IF EXISTS user_role_view CASCADE;
DROP VIEW IF EXISTS user_permissions_view CASCADE;
DROP VIEW IF EXISTS users_with_roles_and_permissions CASCADE;

-- Create materialized view for user roles
CREATE MATERIALIZED VIEW user_roles_view AS
SELECT DISTINCT
  ur.user_id,
  r.id as role_id,
  r.name as role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id;

-- Create index for better performance
CREATE UNIQUE INDEX idx_user_roles_view_user_id ON user_roles_view(user_id, role_id);

-- Create materialized view for user permissions
CREATE MATERIALIZED VIEW user_permissions_view AS
SELECT DISTINCT
  ur.user_id,
  p.name as permission_name
FROM user_roles ur
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id;

-- Create index for better performance
CREATE UNIQUE INDEX idx_user_permissions_view_user_perm ON user_permissions_view(user_id, permission_name);

-- Create materialized view for users with roles and permissions
CREATE MATERIALIZED VIEW users_with_roles_and_permissions AS
SELECT 
  u.id,
  u.email,
  u.created_at,
  urv.role_name,
  array_agg(DISTINCT upv.permission_name) as permissions
FROM auth.users u
LEFT JOIN user_roles_view urv ON u.id = urv.user_id
LEFT JOIN user_permissions_view upv ON u.id = upv.user_id
GROUP BY u.id, u.email, u.created_at, urv.role_name;

-- Create index for better performance
CREATE UNIQUE INDEX idx_users_with_roles_perms_id ON users_with_roles_and_permissions(id);

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_role_views()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_roles_view;
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_permissions_view;
  REFRESH MATERIALIZED VIEW CONCURRENTLY users_with_roles_and_permissions;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to refresh views
CREATE TRIGGER refresh_views_on_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_role_views();

CREATE TRIGGER refresh_views_on_role_permissions
  AFTER INSERT OR UPDATE OR DELETE ON role_permissions
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_role_views();

-- Create simplified policies using materialized views
CREATE POLICY "Enable read for all authenticated users"
ON roles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable read for all authenticated users"
ON permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable read for all authenticated users"
ON role_permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable read for all authenticated users"
ON user_roles FOR SELECT
TO authenticated
USING (true);

-- Create management policies using materialized views
CREATE POLICY "Enable management for master users"
ON roles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles_view
    WHERE user_id = auth.uid()
    AND role_name = 'master'
  )
);

CREATE POLICY "Enable management for master users"
ON permissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles_view
    WHERE user_id = auth.uid()
    AND role_name = 'master'
  )
);

CREATE POLICY "Enable management for master users"
ON role_permissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles_view
    WHERE user_id = auth.uid()
    AND role_name = 'master'
  )
);

CREATE POLICY "Enable management for master users"
ON user_roles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles_view
    WHERE user_id = auth.uid()
    AND role_name = 'master'
  )
);

-- Refresh materialized views
REFRESH MATERIALIZED VIEW CONCURRENTLY user_roles_view;
REFRESH MATERIALIZED VIEW CONCURRENTLY user_permissions_view;
REFRESH MATERIALIZED VIEW CONCURRENTLY users_with_roles_and_permissions;