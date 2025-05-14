-- Drop existing views and policies with CASCADE
DROP VIEW IF EXISTS user_role_view CASCADE;
DROP VIEW IF EXISTS user_permissions_view CASCADE;

-- Create base tables if they don't exist
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create view for user roles
CREATE VIEW user_role_view AS
SELECT 
  ur.user_id,
  r.name as role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id;

-- Create view for user permissions
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

-- Create basic read policies
CREATE POLICY "Allow read access to all authenticated users"
ON roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to all authenticated users"
ON permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to all authenticated users"
ON role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to all authenticated users"
ON user_roles FOR SELECT TO authenticated USING (true);

-- Create management policies
CREATE POLICY "Allow management by master users"
ON roles FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_role_view
  WHERE user_id = auth.uid()
  AND role_name = 'master'
));

CREATE POLICY "Allow management by master users"
ON permissions FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_role_view
  WHERE user_id = auth.uid()
  AND role_name = 'master'
));

CREATE POLICY "Allow management by master users"
ON role_permissions FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_role_view
  WHERE user_id = auth.uid()
  AND role_name = 'master'
));

CREATE POLICY "Allow management by master users"
ON user_roles FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_role_view
  WHERE user_id = auth.uid()
  AND role_name = 'master'
));

-- Insert default roles one by one
INSERT INTO roles (name, description)
SELECT 'master', 'Acesso total ao sistema'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'master');

INSERT INTO roles (name, description)
SELECT 'admin', 'Acesso administrativo'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin');

INSERT INTO roles (name, description)
SELECT 'user', 'Acesso básico'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'user');

-- Insert default permissions one by one
INSERT INTO permissions (name, description)
SELECT 'dashboard.view', 'Visualizar dashboard'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'dashboard.view');

INSERT INTO permissions (name, description)
SELECT 'entries.view', 'Visualizar lançamentos'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'entries.view');

INSERT INTO permissions (name, description)
SELECT 'entries.create', 'Criar lançamentos'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'entries.create');

INSERT INTO permissions (name, description)
SELECT 'entries.edit', 'Editar lançamentos'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'entries.edit');

INSERT INTO permissions (name, description)
SELECT 'entries.delete', 'Excluir lançamentos'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'entries.delete');

INSERT INTO permissions (name, description)
SELECT 'cashflow.view', 'Visualizar fluxo de caixa'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'cashflow.view');

INSERT INTO permissions (name, description)
SELECT 'cashflow.edit', 'Editar fluxo de caixa'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'cashflow.edit');

INSERT INTO permissions (name, description)
SELECT 'analysis.view', 'Visualizar análises'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'analysis.view');

INSERT INTO permissions (name, description)
SELECT 'partners.view', 'Visualizar parceiros'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'partners.view');

INSERT INTO permissions (name, description)
SELECT 'partners.manage', 'Gerenciar parceiros'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'partners.manage');

INSERT INTO permissions (name, description)
SELECT 'users.view', 'Visualizar usuários'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'users.view');

INSERT INTO permissions (name, description)
SELECT 'users.manage', 'Gerenciar usuários'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'users.manage');

INSERT INTO permissions (name, description)
SELECT 'settings.view', 'Visualizar configurações'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'settings.view');

INSERT INTO permissions (name, description)
SELECT 'settings.manage', 'Gerenciar configurações'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'settings.manage');

-- Assign permissions to master role
DO $$
DECLARE
  v_master_role_id uuid;
  v_permission_id uuid;
BEGIN
  SELECT id INTO v_master_role_id FROM roles WHERE name = 'master';
  
  FOR v_permission_id IN SELECT id FROM permissions
  LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_master_role_id, v_permission_id
    WHERE NOT EXISTS (
      SELECT 1 FROM role_permissions
      WHERE role_id = v_master_role_id
      AND permission_id = v_permission_id
    );
  END LOOP;
END $$;