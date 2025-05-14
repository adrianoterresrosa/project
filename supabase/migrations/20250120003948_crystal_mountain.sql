-- Drop existing views and policies with CASCADE
DROP VIEW IF EXISTS user_role_view CASCADE;
DROP VIEW IF EXISTS user_permissions_view CASCADE;

-- Create base tables if they don't exist
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint to roles name
ALTER TABLE roles ADD CONSTRAINT roles_name_key UNIQUE (name);

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint to permissions name
ALTER TABLE permissions ADD CONSTRAINT permissions_name_key UNIQUE (name);

CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint to role_permissions
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id);

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint to user_roles
ALTER TABLE user_roles ADD CONSTRAINT user_roles_unique UNIQUE (user_id, role_id);

-- Create view for user roles without recursion
CREATE VIEW user_role_view AS
SELECT DISTINCT
  ur.user_id,
  r.id as role_id,
  r.name as role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id;

-- Create view for user permissions without recursion
CREATE VIEW user_permissions_view AS
SELECT DISTINCT
  ur.user_id,
  p.name as permission_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create basic read policies without recursion
CREATE POLICY "Allow read access to authenticated users"
ON roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users"
ON permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users"
ON role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users"
ON user_roles FOR SELECT TO authenticated USING (true);

-- Create management policies without recursion
CREATE POLICY "Allow management by master users"
ON roles FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'master'
  )
);

CREATE POLICY "Allow management by master users"
ON permissions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'master'
  )
);

CREATE POLICY "Allow management by master users"
ON role_permissions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'master'
  )
);

CREATE POLICY "Allow management by master users"
ON user_roles FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'master'
  )
);

-- Insert default roles
INSERT INTO roles (name, description)
SELECT 'master', 'Acesso total ao sistema'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'master');

INSERT INTO roles (name, description)
SELECT 'admin', 'Acesso administrativo'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin');

INSERT INTO roles (name, description)
SELECT 'user', 'Acesso básico'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'user');

-- Insert default permissions
DO $$
BEGIN
  INSERT INTO permissions (name, description)
  VALUES
    ('dashboard.view', 'Visualizar dashboard'),
    ('entries.view', 'Visualizar lançamentos'),
    ('entries.create', 'Criar lançamentos'),
    ('entries.edit', 'Editar lançamentos'),
    ('entries.delete', 'Excluir lançamentos'),
    ('cashflow.view', 'Visualizar fluxo de caixa'),
    ('cashflow.edit', 'Editar fluxo de caixa'),
    ('analysis.view', 'Visualizar análises'),
    ('partners.view', 'Visualizar parceiros'),
    ('partners.manage', 'Gerenciar parceiros'),
    ('users.view', 'Visualizar usuários'),
    ('users.manage', 'Gerenciar usuários'),
    ('settings.view', 'Visualizar configurações'),
    ('settings.manage', 'Gerenciar configurações')
  ON CONFLICT ON CONSTRAINT permissions_name_key DO NOTHING;
END $$;

-- Assign permissions to master role
DO $$
DECLARE
  v_master_role_id uuid;
BEGIN
  -- Get master role ID
  SELECT id INTO v_master_role_id FROM roles WHERE name = 'master';
  
  -- Assign all permissions to master role
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_master_role_id, id FROM permissions
  ON CONFLICT ON CONSTRAINT role_permissions_unique DO NOTHING;
END $$;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_user_role_id uuid;
BEGIN
  -- Get user role ID
  SELECT id INTO v_user_role_id FROM roles WHERE name = 'user';
  
  -- Assign user role to new user
  INSERT INTO user_roles (user_id, role_id)
  VALUES (NEW.id, v_user_role_id)
  ON CONFLICT ON CONSTRAINT user_roles_unique DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();