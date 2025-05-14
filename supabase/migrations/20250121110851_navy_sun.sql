-- Primeiro, vamos garantir que as políticas de RLS estejam corretas
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE subgroups ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Users can delete their own groups" ON groups;
DROP POLICY IF EXISTS "Users can delete their own subgroups" ON subgroups;
DROP POLICY IF EXISTS "Users can delete their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can delete their own entries" ON entries;

-- Criar políticas mais permissivas para grupos
CREATE POLICY "Enable all operations for users own groups"
ON groups
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Criar políticas mais permissivas para subgrupos
CREATE POLICY "Enable all operations for users own subgroups"
ON subgroups
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Criar políticas mais permissivas para contas
CREATE POLICY "Enable all operations for users own accounts"
ON accounts
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Criar políticas mais permissivas para entradas
CREATE POLICY "Enable all operations for users own entries"
ON entries
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Garantir que as chaves estrangeiras estejam com DELETE CASCADE
ALTER TABLE subgroups 
DROP CONSTRAINT IF EXISTS subgroups_group_id_fkey,
ADD CONSTRAINT subgroups_group_id_fkey 
FOREIGN KEY (group_id) 
REFERENCES groups(id) 
ON DELETE CASCADE;

ALTER TABLE accounts 
DROP CONSTRAINT IF EXISTS accounts_subgroup_id_fkey,
ADD CONSTRAINT accounts_subgroup_id_fkey 
FOREIGN KEY (subgroup_id) 
REFERENCES subgroups(id) 
ON DELETE CASCADE;

ALTER TABLE entries 
DROP CONSTRAINT IF EXISTS entries_account_id_fkey,
ADD CONSTRAINT entries_account_id_fkey 
FOREIGN KEY (account_id) 
REFERENCES accounts(id) 
ON DELETE CASCADE;