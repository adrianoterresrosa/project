-- Primeiro, desabilitar RLS temporariamente nas tabelas principais
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Remover todas as views e materialized views existentes
DO $$ 
DECLARE
  v_view record;
BEGIN
  -- Remover todas as views que começam com 'user_' ou contêm 'roles' ou 'permissions'
  FOR v_view IN (
    SELECT viewname 
    FROM pg_views 
    WHERE schemaname = 'public' 
    AND (
      viewname LIKE 'user_%' OR 
      viewname LIKE '%roles%' OR 
      viewname LIKE '%permissions%'
    )
  ) LOOP
    EXECUTE 'DROP VIEW IF EXISTS ' || v_view.viewname || ' CASCADE';
  END LOOP;

  -- Remover todas as materialized views que começam com 'user_' ou contêm 'roles' ou 'permissions'
  FOR v_view IN (
    SELECT matviewname 
    FROM pg_matviews 
    WHERE schemaname = 'public' 
    AND (
      matviewname LIKE 'user_%' OR 
      matviewname LIKE '%roles%' OR 
      matviewname LIKE '%permissions%'
    )
  ) LOOP
    EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS ' || v_view.matviewname || ' CASCADE';
  END LOOP;
END $$;

-- Criar views simples sem dependências de RLS
CREATE VIEW user_roles_view AS
SELECT DISTINCT ON (ur.user_id, r.id)
  ur.user_id,
  r.id as role_id,
  r.name as role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id;

CREATE VIEW user_permissions_view AS
SELECT DISTINCT
  ur.user_id,
  array_agg(DISTINCT p.name) as permissions
FROM user_roles ur
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
GROUP BY ur.user_id;

CREATE VIEW users_with_roles_permissions AS
SELECT 
  u.id,
  u.email,
  u.created_at,
  urv.role_name,
  COALESCE(upv.permissions, ARRAY[]::text[]) as permissions
FROM auth.users u
LEFT JOIN user_roles_view urv ON u.id = urv.user_id
LEFT JOIN user_permissions_view upv ON u.id = upv.user_id;

-- Garantir que o usuário master tenha a role correta
DO $$ 
DECLARE
  v_user_id uuid;
  v_master_role_id uuid;
BEGIN
  -- Obter ID do usuário pelo email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'adrianoterresrosa@gmail.com';

  -- Obter ID da role master
  SELECT id INTO v_master_role_id
  FROM roles
  WHERE name = 'master';

  -- Se ambos existirem, garantir que a role master esteja definida
  IF v_user_id IS NOT NULL AND v_master_role_id IS NOT NULL THEN
    -- Remover roles existentes primeiro
    DELETE FROM user_roles WHERE user_id = v_user_id;
    
    -- Inserir role master
    INSERT INTO user_roles (user_id, role_id)
    VALUES (v_user_id, v_master_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
END $$;

-- Reabilitar RLS nas tabelas
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Criar políticas simplificadas
CREATE POLICY "Allow read access for authenticated users"
ON roles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access for authenticated users"
ON permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access for authenticated users"
ON role_permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access for authenticated users"
ON user_roles FOR SELECT
TO authenticated
USING (true);

-- Criar políticas de gerenciamento apenas para master
CREATE POLICY "Allow management for master users"
ON roles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles_view
    WHERE user_id = auth.uid()
    AND role_name = 'master'
  )
);

CREATE POLICY "Allow management for master users"
ON permissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles_view
    WHERE user_id = auth.uid()
    AND role_name = 'master'
  )
);

CREATE POLICY "Allow management for master users"
ON role_permissions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles_view
    WHERE user_id = auth.uid()
    AND role_name = 'master'
  )
);

CREATE POLICY "Allow management for master users"
ON user_roles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles_view
    WHERE user_id = auth.uid()
    AND role_name = 'master'
  )
);