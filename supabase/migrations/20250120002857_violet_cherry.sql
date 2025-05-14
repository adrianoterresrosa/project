-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Permitir visualização de roles próprias" ON user_roles;
DROP POLICY IF EXISTS "Permitir gerenciamento de roles por administradores" ON user_roles;

-- Create a view to cache user roles without recursion
CREATE OR REPLACE VIEW user_role_view AS
SELECT 
  ur.user_id,
  r.name as role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id;

-- Create simplified policies
CREATE POLICY "Visualizar roles"
ON user_roles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Gerenciar roles"
ON user_roles
USING (
  EXISTS (
    SELECT 1 
    FROM user_role_view 
    WHERE user_id = auth.uid() 
    AND role_name IN ('master', 'admin')
  )
);

-- Create a view for user permissions
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT DISTINCT
  ur.user_id,
  p.name as permission_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id;

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
    INSERT INTO user_roles (user_id, role_id)
    VALUES (v_user_id, v_master_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
END $$;