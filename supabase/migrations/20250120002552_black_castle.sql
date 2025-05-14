-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Somente master pode gerenciar user_roles" ON user_roles;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias roles" ON user_roles;
DROP POLICY IF EXISTS "Administradores podem gerenciar roles de usuário" ON user_roles;

-- Create new, simplified policies
CREATE POLICY "Usuários podem ver suas próprias roles"
ON user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Administradores podem gerenciar roles"
ON user_roles
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur2
    WHERE ur2.user_id = auth.uid()
    AND ur2.role_id IN (
      SELECT id FROM roles WHERE name IN ('master', 'admin')
    )
  )
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);