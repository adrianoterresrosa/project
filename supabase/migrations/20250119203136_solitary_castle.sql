/*
  # Criar tabela de configurações do usuário

  1. Nova Tabela
    - `user_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, referência para auth.users)
      - `settings` (jsonb, configurações do usuário)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela
    - Adicionar políticas para usuários autenticados
*/

-- Criar tabela de configurações do usuário
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança
CREATE POLICY "Usuários podem ver suas próprias configurações"
  ON user_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias configurações"
  ON user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias configurações"
  ON user_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias configurações"
  ON user_settings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Criar índice para melhor performance
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- Criar trigger para atualizar o updated_at
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_settings_timestamp
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_settings_updated_at();