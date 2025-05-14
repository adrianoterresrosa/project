-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Somente master pode gerenciar user_roles" ON user_roles;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias roles" ON user_roles;
DROP POLICY IF EXISTS "Administradores podem gerenciar roles" ON user_roles;

-- Create new, simplified policies
CREATE POLICY "Usuários podem ver suas próprias roles"
ON user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create a separate policy for each operation
CREATE POLICY "Administradores podem visualizar roles"
ON user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur2
    JOIN roles r ON ur2.role_id = r.id
    WHERE ur2.user_id = auth.uid()
    AND r.name IN ('master', 'admin')
  )
);

CREATE POLICY "Administradores podem inserir roles"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur2
    JOIN roles r ON ur2.role_id = r.id
    WHERE ur2.user_id = auth.uid()
    AND r.name IN ('master', 'admin')
  )
);

CREATE POLICY "Administradores podem atualizar roles"
ON user_roles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur2
    JOIN roles r ON ur2.role_id = r.id
    WHERE ur2.user_id = auth.uid()
    AND r.name IN ('master', 'admin')
  )
);

CREATE POLICY "Administradores podem deletar roles"
ON user_roles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur2
    JOIN roles r ON ur2.role_id = r.id
    WHERE ur2.user_id = auth.uid()
    AND r.name IN ('master', 'admin')
  )
);

-- Create materialized view for caching permissions
CREATE MATERIALIZED VIEW IF NOT EXISTS user_permissions AS
SELECT DISTINCT
  ur.user_id,
  p.name as permission_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id;

-- Create index for better performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_permissions_user_permission 
ON user_permissions(user_id, permission_name);

-- Function to refresh permissions view
CREATE OR REPLACE FUNCTION refresh_user_permissions()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_permissions;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to refresh permissions view
DROP TRIGGER IF EXISTS refresh_permissions_on_user_roles ON user_roles;
CREATE TRIGGER refresh_permissions_on_user_roles
  AFTER INSERT OR UPDATE OR DELETE
  ON user_roles
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_user_permissions();

DROP TRIGGER IF EXISTS refresh_permissions_on_role_permissions ON role_permissions;
CREATE TRIGGER refresh_permissions_on_role_permissions
  AFTER INSERT OR UPDATE OR DELETE
  ON role_permissions
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_user_permissions();