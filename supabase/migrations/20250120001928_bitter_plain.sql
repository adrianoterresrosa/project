-- Criar enum para níveis de acesso
CREATE TYPE user_role AS ENUM ('master', 'admin', 'user');

-- Criar tabela de permissões
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de roles (papéis)
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de permissões por role
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Criar tabela de usuários estendida
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Habilitar RLS
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Criar políticas
CREATE POLICY "Somente master pode gerenciar permissões"
  ON permissions
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'master'
    )
  );

CREATE POLICY "Somente master pode gerenciar roles"
  ON roles
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'master'
    )
  );

CREATE POLICY "Somente master pode gerenciar role_permissions"
  ON role_permissions
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'master'
    )
  );

CREATE POLICY "Somente master pode gerenciar user_roles"
  ON user_roles
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'master'
    )
  );

-- Inserir roles padrão
INSERT INTO roles (name, description) VALUES
  ('master', 'Acesso total ao sistema'),
  ('admin', 'Acesso administrativo'),
  ('user', 'Acesso básico')
ON CONFLICT DO NOTHING;

-- Inserir permissões padrão
INSERT INTO permissions (name, description) VALUES
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
ON CONFLICT DO NOTHING;

-- Associar permissões aos roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'master'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.name NOT IN ('users.manage', 'settings.manage')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'user'
  AND p.name IN ('dashboard.view', 'entries.view', 'entries.create')
ON CONFLICT DO NOTHING;

-- Função para verificar permissão
CREATE OR REPLACE FUNCTION check_permission(
  user_id uuid,
  permission_name text
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = user_id
    AND p.name = permission_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atribuir role padrão para novos usuários
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_roles (user_id, role_id)
  SELECT NEW.id, r.id
  FROM roles r
  WHERE r.name = 'user';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_role();