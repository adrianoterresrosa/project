-- Drop existing policies
DROP POLICY IF EXISTS "Usuários podem ver suas próprias roles" ON user_roles;
DROP POLICY IF EXISTS "Administradores podem visualizar roles" ON user_roles;
DROP POLICY IF EXISTS "Administradores podem inserir roles" ON user_roles;
DROP POLICY IF EXISTS "Administradores podem atualizar roles" ON user_roles;
DROP POLICY IF EXISTS "Administradores podem deletar roles" ON user_roles;

-- Create simplified policies that avoid recursion
CREATE POLICY "Permitir visualização de roles próprias"
ON user_roles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR 
  EXISTS (
    SELECT 1 FROM roles r
    WHERE r.name IN ('master', 'admin')
    AND r.id IN (
      SELECT role_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Permitir gerenciamento de roles por administradores"
ON user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM roles r
    WHERE r.name IN ('master', 'admin')
    AND r.id IN (
      SELECT role_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM roles r
    WHERE r.name IN ('master', 'admin')
    AND r.id IN (
      SELECT role_id FROM user_roles 
      WHERE user_id = auth.uid()
    )
  )
);

-- Refresh materialized view to ensure permissions are up to date
REFRESH MATERIALIZED VIEW CONCURRENTLY user_permissions;