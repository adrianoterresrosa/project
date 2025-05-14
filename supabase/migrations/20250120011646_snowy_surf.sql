-- Primeiro, remover TODAS as views e materialized views existentes
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

-- Remover triggers e funções relacionadas
DROP TRIGGER IF EXISTS refresh_views_on_user_roles ON user_roles;
DROP TRIGGER IF EXISTS refresh_views_on_role_permissions ON role_permissions;
DROP TRIGGER IF EXISTS refresh_permissions_on_user_roles ON user_roles;
DROP FUNCTION IF EXISTS refresh_role_views() CASCADE;
DROP FUNCTION IF EXISTS refresh_user_permissions() CASCADE;

-- Criar uma única view para roles de usuário
CREATE VIEW user_roles_view AS
SELECT DISTINCT ON (ur.user_id, r.id)
  ur.user_id,
  r.id as role_id,
  r.name as role_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id;

-- Criar uma única view para permissões de usuário
CREATE VIEW user_permissions_view AS
SELECT DISTINCT
  ur.user_id,
  array_agg(DISTINCT p.name) as permissions
FROM user_roles ur
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
GROUP BY ur.user_id;

-- Criar view final para usuários com roles e permissões
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

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

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