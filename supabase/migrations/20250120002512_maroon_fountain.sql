-- Obter o ID do usuário
DO $$ 
DECLARE
  v_user_id uuid;
  v_master_role_id uuid;
BEGIN
  -- Obter o ID do usuário pelo email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'adrianoterresrosa@gmail.com';

  -- Obter o ID da role master
  SELECT id INTO v_master_role_id
  FROM roles
  WHERE name = 'master';

  -- Se o usuário existir, atribuir a role master
  IF v_user_id IS NOT NULL AND v_master_role_id IS NOT NULL THEN
    -- Remover roles existentes do usuário
    DELETE FROM user_roles WHERE user_id = v_user_id;
    
    -- Inserir a role master
    INSERT INTO user_roles (user_id, role_id)
    VALUES (v_user_id, v_master_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
END $$;