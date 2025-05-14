-- Adicionar políticas de exclusão em cascata para grupos e relacionados

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can delete their own groups" ON groups;
DROP POLICY IF EXISTS "Users can delete their own subgroups" ON subgroups;
DROP POLICY IF EXISTS "Users can delete their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can delete their own entries" ON entries;

-- Criar novas políticas de exclusão
CREATE POLICY "Users can delete their own groups"
  ON groups
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subgroups"
  ON subgroups
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
  ON accounts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entries"
  ON entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Verificar e ajustar as chaves estrangeiras para garantir exclusão em cascata
DO $$ 
BEGIN
  -- Verificar e recriar a chave estrangeira de subgroups para groups se necessário
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'subgroups_group_id_fkey'
  ) THEN
    ALTER TABLE subgroups 
    DROP CONSTRAINT subgroups_group_id_fkey,
    ADD CONSTRAINT subgroups_group_id_fkey 
    FOREIGN KEY (group_id) 
    REFERENCES groups(id) 
    ON DELETE CASCADE;
  END IF;

  -- Verificar e recriar a chave estrangeira de accounts para subgroups se necessário
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'accounts_subgroup_id_fkey'
  ) THEN
    ALTER TABLE accounts 
    DROP CONSTRAINT accounts_subgroup_id_fkey,
    ADD CONSTRAINT accounts_subgroup_id_fkey 
    FOREIGN KEY (subgroup_id) 
    REFERENCES subgroups(id) 
    ON DELETE CASCADE;
  END IF;

  -- Verificar e recriar a chave estrangeira de entries para accounts se necessário
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'entries_account_id_fkey'
  ) THEN
    ALTER TABLE entries 
    DROP CONSTRAINT entries_account_id_fkey,
    ADD CONSTRAINT entries_account_id_fkey 
    FOREIGN KEY (account_id) 
    REFERENCES accounts(id) 
    ON DELETE CASCADE;
  END IF;
END $$;