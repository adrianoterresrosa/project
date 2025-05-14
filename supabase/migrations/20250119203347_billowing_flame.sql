-- Criar tabela de configurações do usuário se não existir
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS se ainda não estiver habilitado
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_settings' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Criar políticas de segurança se não existirem
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_settings' 
    AND policyname = 'Usuários podem ver suas próprias configurações'
  ) THEN
    CREATE POLICY "Usuários podem ver suas próprias configurações"
      ON user_settings
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_settings' 
    AND policyname = 'Usuários podem inserir suas próprias configurações'
  ) THEN
    CREATE POLICY "Usuários podem inserir suas próprias configurações"
      ON user_settings
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_settings' 
    AND policyname = 'Usuários podem atualizar suas próprias configurações'
  ) THEN
    CREATE POLICY "Usuários podem atualizar suas próprias configurações"
      ON user_settings
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Criar índice se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'user_settings' 
    AND indexname = 'idx_user_settings_user_id'
  ) THEN
    CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
  END IF;
END $$;

-- Criar ou substituir a função do trigger
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_user_settings_timestamp'
  ) THEN
    CREATE TRIGGER update_user_settings_timestamp
      BEFORE UPDATE ON user_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_user_settings_updated_at();
  END IF;
END $$;