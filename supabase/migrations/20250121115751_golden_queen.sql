-- Primeiro, adicionar constraint única para subgrupos
ALTER TABLE subgroups
ADD CONSTRAINT subgroups_user_group_name_key UNIQUE (user_id, group_id, name);

-- Adicionar constraint única para contas
ALTER TABLE accounts
ADD CONSTRAINT accounts_user_subgroup_name_key UNIQUE (user_id, subgroup_id, name);

-- Função para adicionar contas de receita
CREATE OR REPLACE FUNCTION add_revenue_accounts(p_user_id uuid) RETURNS void AS $$
DECLARE
  v_group_id uuid;
  v_subgroup_id uuid;
BEGIN
  -- Receita
  SELECT id INTO v_group_id
  FROM groups
  WHERE user_id = p_user_id AND name = 'Receita';

  IF v_group_id IS NOT NULL THEN
    -- Criar subgrupo Receita
    INSERT INTO subgroups (user_id, group_id, name)
    VALUES (p_user_id, v_group_id, 'Receita')
    ON CONFLICT (user_id, group_id, name) DO NOTHING
    RETURNING id INTO v_subgroup_id;

    -- Se não conseguiu o id do RETURNING, buscar o id existente
    IF v_subgroup_id IS NULL THEN
      SELECT id INTO v_subgroup_id
      FROM subgroups
      WHERE user_id = p_user_id 
      AND group_id = v_group_id 
      AND name = 'Receita';
    END IF;

    -- Adicionar conta padrão
    IF v_subgroup_id IS NOT NULL THEN
      INSERT INTO accounts (user_id, subgroup_id, name, is_active)
      VALUES (p_user_id, v_subgroup_id, 'opção e criar contas de Receitas', true)
      ON CONFLICT (user_id, subgroup_id, name) DO NOTHING;
    END IF;
  END IF;

  -- Receita Financeira
  SELECT id INTO v_group_id
  FROM groups
  WHERE user_id = p_user_id AND name = 'Receita Financeira';

  IF v_group_id IS NOT NULL THEN
    -- Criar subgrupo Receita Financeira
    INSERT INTO subgroups (user_id, group_id, name)
    VALUES (p_user_id, v_group_id, 'Receita Financeira')
    ON CONFLICT (user_id, group_id, name) DO NOTHING
    RETURNING id INTO v_subgroup_id;

    -- Se não conseguiu o id do RETURNING, buscar o id existente
    IF v_subgroup_id IS NULL THEN
      SELECT id INTO v_subgroup_id
      FROM subgroups
      WHERE user_id = p_user_id 
      AND group_id = v_group_id 
      AND name = 'Receita Financeira';
    END IF;

    -- Adicionar contas de Receita Financeira
    IF v_subgroup_id IS NOT NULL THEN
      -- Inserir cada conta individualmente para melhor controle de erros
      INSERT INTO accounts (user_id, subgroup_id, name, is_active)
      VALUES (p_user_id, v_subgroup_id, 'Rendimentos de Aplicações Financeiras', true)
      ON CONFLICT (user_id, subgroup_id, name) DO NOTHING;

      INSERT INTO accounts (user_id, subgroup_id, name, is_active)
      VALUES (p_user_id, v_subgroup_id, 'Juros e Descontos Obtidos', true)
      ON CONFLICT (user_id, subgroup_id, name) DO NOTHING;

      INSERT INTO accounts (user_id, subgroup_id, name, is_active)
      VALUES (p_user_id, v_subgroup_id, 'Variação Cambial', true)
      ON CONFLICT (user_id, subgroup_id, name) DO NOTHING;

      INSERT INTO accounts (user_id, subgroup_id, name, is_active)
      VALUES (p_user_id, v_subgroup_id, 'Outras Receitas Financeiras', true)
      ON CONFLICT (user_id, subgroup_id, name) DO NOTHING;

      INSERT INTO accounts (user_id, subgroup_id, name, is_active)
      VALUES (p_user_id, v_subgroup_id, 'opção e criar outras contas Receita Financeira', true)
      ON CONFLICT (user_id, subgroup_id, name) DO NOTHING;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Executar a função para todos os usuários existentes
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM auth.users
  LOOP
    PERFORM add_revenue_accounts(r.id);
  END LOOP;
END $$;