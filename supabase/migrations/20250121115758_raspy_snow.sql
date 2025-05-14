-- Add unique constraints if they don't exist
DO $$ 
BEGIN
  -- Add unique constraint for subgroups
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'subgroups_user_id_group_id_name_key'
  ) THEN
    ALTER TABLE subgroups 
    ADD CONSTRAINT subgroups_user_id_group_id_name_key 
    UNIQUE (user_id, group_id, name);
  END IF;

  -- Add unique constraint for accounts
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'accounts_user_id_subgroup_id_name_key'
  ) THEN
    ALTER TABLE accounts 
    ADD CONSTRAINT accounts_user_id_subgroup_id_name_key 
    UNIQUE (user_id, subgroup_id, name);
  END IF;
END $$;

-- Function to add revenue accounts
CREATE OR REPLACE FUNCTION add_revenue_accounts() RETURNS void AS $$
DECLARE
  r RECORD;
  v_group_id uuid;
  v_subgroup_id uuid;
BEGIN
  -- For each user
  FOR r IN SELECT id FROM auth.users
  LOOP
    -- Handle Receita group
    SELECT id INTO v_group_id
    FROM groups
    WHERE user_id = r.id AND name = 'Receita';

    IF v_group_id IS NOT NULL THEN
      -- Create Receita subgroup
      INSERT INTO subgroups (user_id, group_id, name)
      VALUES (r.id, v_group_id, 'Receita')
      ON CONFLICT (user_id, group_id, name) DO NOTHING
      RETURNING id INTO v_subgroup_id;

      IF v_subgroup_id IS NOT NULL THEN
        -- Add default account
        INSERT INTO accounts (user_id, subgroup_id, name, is_active)
        VALUES (r.id, v_subgroup_id, 'opção e criar contas de Receitas', true)
        ON CONFLICT (user_id, subgroup_id, name) DO NOTHING;
      END IF;
    END IF;

    -- Handle Receita Financeira group
    SELECT id INTO v_group_id
    FROM groups
    WHERE user_id = r.id AND name = 'Receita Financeira';

    IF v_group_id IS NOT NULL THEN
      -- Create Receita Financeira subgroup
      INSERT INTO subgroups (user_id, group_id, name)
      VALUES (r.id, v_group_id, 'Receita Financeira')
      ON CONFLICT (user_id, group_id, name) DO NOTHING
      RETURNING id INTO v_subgroup_id;

      IF v_subgroup_id IS NOT NULL THEN
        -- Add Receita Financeira accounts
        INSERT INTO accounts (user_id, subgroup_id, name, is_active)
        VALUES 
          (r.id, v_subgroup_id, 'Rendimentos de Aplicações Financeiras', true),
          (r.id, v_subgroup_id, 'Juros e Descontos Obtidos', true),
          (r.id, v_subgroup_id, 'Variação Cambial', true),
          (r.id, v_subgroup_id, 'Outras Receitas Financeiras', true),
          (r.id, v_subgroup_id, 'opção e criar outras contas Receita Financeira', true)
        ON CONFLICT (user_id, subgroup_id, name) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function
SELECT add_revenue_accounts();