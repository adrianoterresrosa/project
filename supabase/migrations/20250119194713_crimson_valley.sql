/*
  # Estrutura do Sistema Financeiro

  1. Novas Tabelas
    - `financial_categories` - Categorias financeiras (Receita, Custos, Despesas, etc)
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `name` (text)
      - `type` (text) - 'revenue', 'cost', 'expense', 'investment'
      - `parent_id` (uuid, self-reference) - Para subcategorias
      - `created_at` (timestamptz)
      
    - `financial_entries` - Lançamentos financeiros
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `category_id` (uuid, foreign key)
      - `date` (date)
      - `amount` (decimal)
      - `type` (text) - 'planned', 'actual'
      - `description` (text)
      - `created_at` (timestamptz)

    - `financial_indicators` - Indicadores financeiros
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `month` (date)
      - `category_id` (uuid, foreign key)
      - `planned_amount` (decimal)
      - `actual_amount` (decimal)
      - `ah_percentage` (decimal) - Análise Horizontal
      - `av_percentage` (decimal) - Análise Vertical
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Categorias Financeiras
CREATE TABLE IF NOT EXISTS financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('revenue', 'cost', 'expense', 'investment')),
  parent_id uuid REFERENCES financial_categories(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON financial_categories
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON financial_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Lançamentos Financeiros
CREATE TABLE IF NOT EXISTS financial_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES financial_categories(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  amount decimal(12,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('planned', 'actual')),
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entries"
  ON financial_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries"
  ON financial_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indicadores Financeiros
CREATE TABLE IF NOT EXISTS financial_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  month date NOT NULL,
  category_id uuid REFERENCES financial_categories(id) ON DELETE CASCADE NOT NULL,
  planned_amount decimal(12,2) DEFAULT 0,
  actual_amount decimal(12,2) DEFAULT 0,
  ah_percentage decimal(5,2), -- Análise Horizontal
  av_percentage decimal(5,2), -- Análise Vertical
  created_at timestamptz DEFAULT now()
);

ALTER TABLE financial_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own indicators"
  ON financial_indicators
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own indicators"
  ON financial_indicators
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_financial_categories_user_id ON financial_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_categories_parent_id ON financial_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_user_id ON financial_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_category_id ON financial_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_date ON financial_entries(date);
CREATE INDEX IF NOT EXISTS idx_financial_indicators_user_id ON financial_indicators(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_indicators_month ON financial_indicators(month);
CREATE INDEX IF NOT EXISTS idx_financial_indicators_category_id ON financial_indicators(category_id);